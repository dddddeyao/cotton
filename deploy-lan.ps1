<#
.SYNOPSIS
  棉花智能识别系统 — 局域网一键部署脚本
.DESCRIPTION
  在 Windows 电脑上完成全套部署：
    1. 检测 / 设置局域网 IP（静态 IP 引导）
    2. 配置 Windows 防火墙放行后端端口
    3. 自动启动 Docker 服务（docker compose up -d）
    4. 注册模型推理服务开机自启（Windows 计划任务）
    5. 检查 conda YOLO 环境 & 模型文件
    6. 构建 Release APK（将后端地址编译进包）
    7. 输出部署摘要

  用法（管理员 PowerShell）：
    .\deploy-lan.ps1 [-LanIP "<可选，指定 IP >"]
.PARAMETER LanIP
  可选。指定后端绑定的局域网 IP；不指定则自动检测当前活跃的局域网 IPv4。
.EXAMPLE
  .\deploy-lan.ps1
  .\deploy-lan.ps1 -LanIP "192.168.1.100"
#>

param(
  [string]$LanIP = ""
)

$ErrorActionPreference = "Stop"
$script:ExitCode = 0
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$deployLog = Join-Path $projectRoot "deploy-log-$timestamp.txt"

function Write-Step {
  param([string]$Message, [string]$ForegroundColor = "Cyan")
  $line = "==> $Message"
  Write-Host $line -ForegroundColor $ForegroundColor
  Add-Content -Path $deployLog -Value "[$(Get-Date -Format 'HH:mm:ss')] $line"
}

function Write-OK {
  param([string]$Message)
  $line = "  [OK] $Message"
  Write-Host $line -ForegroundColor Green
  Add-Content -Path $deployLog -Value $line
}

function Write-Warn {
  param([string]$Message)
  $line = "  [WARN] $Message"
  Write-Host $line -ForegroundColor Yellow
  Add-Content -Path $deployLog -Value $line
}

function Write-Err {
  param([string]$Message)
  $line = "  [ERR] $Message"
  Write-Host $line -ForegroundColor Red
  Add-Content -Path $deployLog -Value $line
}

# ──────────────────────────────────────────────
# 0. 检查管理员权限
# ──────────────────────────────────────────────
Write-Step "检查管理员权限..."
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
  Write-Warn "当前不是管理员！部分功能（防火墙、计划任务、服务管理）将失败。建议以管理员身份重新运行。"
  $choice = Read-Host "是否继续（可能部分失败）？[Y/n]"
  if ($choice -ne 'Y' -and $choice -ne 'y' -and $choice -ne '') {
    Write-Err "用户取消部署。请以管理员身份重新运行。"
    exit 1
  }
}

# ──────────────────────────────────────────────
# 1. 确定局域网 IP
# ──────────────────────────────────────────────
Write-Step "确定局域网 IP..."
if ([string]::IsNullOrWhiteSpace($LanIP)) {
  $ipCandidates = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.IPAddress -notlike '172.*' -and
      $_.IPAddress -notlike '192.168.*'
    }
  if (-not $ipCandidates) {
    $ipCandidates = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*'
      }
  }
  $lanIP = ($ipCandidates | Select-Object -First 1).IPAddress
  if (-not $lanIP) {
    Write-Err "无法自动检测局域网 IP，请用 -LanIP 参数手动指定"
    exit 1
  }
  Write-OK "自动检测到局域网 IP: $lanIP"
} else {
  $lanIP = $LanIP
  Write-OK "使用指定的 IP: $lanIP"
}

# ──────────────────────────────────────────────
# 1.5 静态 IP 引导
# ──────────────────────────────────────────────
Write-Step "静态 IP 提醒..."
Write-Host "    当前 IP: $lanIP" -ForegroundColor White
Write-Host "    如果电脑重启后 IP 发生了变化，手机将无法连接后端。" -ForegroundColor Yellow
Write-Host "    建议在 Windows「网络和 Internet 设置 → 更改适配器选项 → WLAN/以太网 → 属性 → IPv4」中设置为静态 IP。" -ForegroundColor Yellow
$choice = Read-Host "    是否确认继续使用 $lanIP ？[Y/n]"
if ($choice -eq 'n' -or $choice -eq 'N') {
  Write-Err "用户取消。请设置好静态 IP 后重新运行。"
  exit 1
}

# ──────────────────────────────────────────────
# 2. 检查 Docker
# ──────────────────────────────────────────────
Write-Step "检查 Docker 环境..."
$dockerOk = $false
try {
  $ver = docker --version 2>&1
  if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch {}

if (-not $dockerOk) {
  Write-Err "Docker 未安装或不在 PATH 中。请先安装 Docker Desktop 后重试。"
  exit 1
}
Write-OK "Docker: $ver"

# ──────────────────────────────────────────────
# 3. 检查 conda / Python 模型服务环境
# ──────────────────────────────────────────────
Write-Step "检查模型服务环境..."
$condaPython = "D:\aconda\envs\YOLO\python.exe"
if (-not (Test-Path $condaPython)) {
  $condaPython = "D:\aconda\python.exe"
  Write-Warn "YOLO 环境未找到，回退到 base 环境"
}
if (-not (Test-Path $condaPython)) {
  Write-Err "找不到 conda Python。请确认 D:\aconda\python.exe 存在。"
  $script:ExitCode = 1
} else {
  $pytorchOk = & $condaPython -c "import torch; print(torch.cuda.is_available())" 2>&1
  if ($pytorchOk -match 'True') {
    Write-OK "PyTorch CUDA 可用（GPU 加速）"
  } else {
    Write-Warn "PyTorch 未检测到 CUDA，将使用 CPU 推理（速度较慢）"
  }
}

$modelDir = Join-Path $projectRoot "services\backend\model-service-python"
$modelFiles = @("fourtime-best.pth", "fenge_best.pth", "impurityarea_best.pth")
foreach ($mf in $modelFiles) {
  $mp = Join-Path $modelDir $mf
  if (-not (Test-Path $mp)) {
    Write-Err "模型文件缺失: $mp"
    $script:ExitCode = 1
  } else {
    Write-OK "模型文件存在: $mf"
  }
}

# ──────────────────────────────────────────────
# 4. 配置 Windows 防火墙
# ──────────────────────────────────────────────
Write-Step "配置 Windows 防火墙..."
$backendPort = 8088
$ruleName = "CottonRecognition-Backend-$backendPort"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existingRule) {
  Write-OK "防火墙规则已存在: $ruleName"
} else {
  try {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $backendPort -Action Allow -Profile Any | Out-Null
    Write-OK "已添加入站 TCP/$backendPort 防火墙规则"
  } catch {
    Write-Warn "添加防火墙规则失败: $_"
    Write-Warn "请手动在 Windows 防火墙中放行 TCP $backendPort 端口"
  }
}

# ──────────────────────────────────────────────
# 5. 配置 Docker 开机自启
# ──────────────────────────────────────────────
Write-Step "配置 Docker 开机自启..."
# 方式1: 设置 Docker Desktop 服务自动启动
try {
  Set-Service -Name "com.docker.service" -StartupType Automatic -ErrorAction SilentlyContinue
  Write-OK "com.docker.service 已设为自动启动"
} catch {
  Write-Warn "无法设置 Docker 服务自动启动"
}

# 方式2: 创建计划任务，在用户登录时启动 Docker Desktop
$dockerDesktopPaths = @(
  "${env:ProgramFiles}\Docker\Docker\Docker Desktop.exe",
  "${env:LOCALAPPDATA}\Docker\Docker Desktop\Docker Desktop.exe",
  "${env:ProgramW6432}\Docker\Docker Desktop\Docker Desktop.exe"
)
$dockerDesktopPath = $null
foreach ($p in $dockerDesktopPaths) {
  if (Test-Path $p) { $dockerDesktopPath = $p; break }
}
if ($dockerDesktopPath) {
  $taskName = "CottonRecognition_DockerDesktop"
  $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if (-not $existingTask) {
    $action = New-ScheduledTaskAction -Execute $dockerDesktopPath
    $trigger = New-ScheduledTaskTrigger -AtLogon
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    Write-OK "已创建计划任务（用户登录时启动 Docker Desktop）"
  } else {
    Write-OK "计划任务已存在: $taskName"
  }
} else {
  Write-Warn "未找到 Docker Desktop.exe，请手动启用 Docker Desktop 开机自启"
}

# ──────────────────────────────────────────────
# 6. 配置模型服务开机自启
# ──────────────────────────────────────────────
Write-Step "配置模型服务开机自启..."
$modelScript = Join-Path $projectRoot "model-service-start.cmd"
$modelTaskName = "CottonRecognition_ModelService"

# 先写启动脚本
$cmdContent = @"
@echo off
REM 棉花智能识别系统 — 模型推理服务启动脚本
REM 由 deploy-lan.ps1 自动生成，不要手动修改

set "CONDA_PYTHON=D:\aconda\envs\YOLO\python.exe"
set "MODEL_DIR=$modelDir"
set "CUDA_VISIBLE_DEVICES=0"
set "LOG_FILE=$modelDir\model-service.log"

echo [%date% %time%] Starting model service... >> "%%LOG_FILE%%" 2>&1
"%%CONDA_PYTHON%%" "%%MODEL_DIR%%\model_service2.py" >> "%%LOG_FILE%%" 2>&1
"@
Set-Content -Path $modelScript -Value $cmdContent -Encoding ASCII
Write-OK "已生成模型服务启动脚本: $modelScript"

# 注册计划任务（开机启动，用户登录后启动）
$existingModelTask = Get-ScheduledTask -TaskName $modelTaskName -ErrorAction SilentlyContinue
if ($existingModelTask) {
  Unregister-ScheduledTask -TaskName $modelTaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-OK "已删除旧的模型服务计划任务"
}

$action = New-ScheduledTaskAction -Execute $modelScript -WorkingDirectory $modelDir
$trigger = New-ScheduledTaskTrigger -AtLogon -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $modelTaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-OK "已注册计划任务 '$modelTaskName'（用户登录时启动模型服务）"

# ──────────────────────────────────────────────
# 7. 生成 .env 配置
# ──────────────────────────────────────────────
Write-Step "生成 .env 配置文件..."
$envPath = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.lan.example"
# Windows 上模型服务以 conda 原生进程运行（可用 GPU），后端容器经 host.docker.internal 访问
$pythonServiceUrl = "http://host.docker.internal:5000"

function Set-EnvValue {
  param([string]$Content, [string]$Key, [string]$Value)
  if ($Content -match "(?m)^$Key=") {
    return ($Content -replace "(?m)^$Key=.*", "$Key=$Value")
  }
  return ($Content.TrimEnd() + "`n$Key=$Value`n")
}

if (-not (Test-Path $envPath)) {
  if (-not (Test-Path $envExample)) {
    Write-Warn "未找到 .env.lan.example，跳过 .env 生成"
  } else {
    $envContent = Get-Content $envExample -Raw -Encoding UTF8
    $envContent = Set-EnvValue $envContent "LAN_HOST_IP" $lanIP
    $envContent = Set-EnvValue $envContent "BACKEND_PUBLIC_PORT" $backendPort
    $jwt = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $envContent = Set-EnvValue $envContent "JWT_SECRET" $jwt
    $envContent = Set-EnvValue $envContent "PYTHON_SERVICE_URL" $pythonServiceUrl
    Set-Content -Path $envPath -Value $envContent -Encoding UTF8
    Write-OK ".env 已生成（JWT_SECRET 已自动生成）"
  }
} else {
  # 已存在：只更新与本机相关的项，保留数据库密码 / JWT_SECRET
  $envContent = Get-Content $envPath -Raw -Encoding UTF8
  $envContent = Set-EnvValue $envContent "LAN_HOST_IP" $lanIP
  $envContent = Set-EnvValue $envContent "BACKEND_PUBLIC_PORT" $backendPort
  $envContent = Set-EnvValue $envContent "PYTHON_SERVICE_URL" $pythonServiceUrl
  if ($envContent -notmatch '(?m)^JWT_SECRET=\S') {
    $jwt = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $envContent = Set-EnvValue $envContent "JWT_SECRET" $jwt
    Write-Warn "原 .env 缺少 JWT_SECRET，已自动补全"
  }
  Set-Content -Path $envPath -Value $envContent -Encoding UTF8
  Write-OK ".env 已更新（保留已有密码与 JWT_SECRET）"
}

# ──────────────────────────────────────────────
# 8. 启动 Docker 服务
# ──────────────────────────────────────────────
Write-Step "启动 Docker 服务..."
Set-Location $projectRoot

# 先检查是否已在运行
docker compose ps 2>$null | Select-Object -Skip 1 | ForEach-Object {
  if ($_ -match 'Up') {
    Write-OK "Docker 服务已在运行"
  }
}

Write-Host "    正在启动 docker compose up -d ..." -ForegroundColor Gray
# Windows 下模型服务以 conda 原生进程运行，无需启动 Docker 版 model-service
$composeResult = docker compose up -d --build mysql backend 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-OK "Docker 服务启动成功"
  # 等待健康检查
  Write-Host "    等待服务健康检查..."
  $maxWait = 60
  $waited = 0
  while ($waited -lt $maxWait) {
    $healthy = docker compose ps --format "{{.Name}} {{.Status}}" 2>$null |
      Where-Object { $_ -match '(backend|mysql)' } |
      ForEach-Object { if ($_ -match 'healthy') { $true } else { $false } }
    if ($healthy -contains $false) {
      Start-Sleep -Seconds 3
      $waited += 3
    } else {
      break
    }
  }
  if ($waited -lt $maxWait) {
    Write-OK "所有 Docker 服务健康检查通过"
  } else {
    Write-Warn "部分服务可能尚未就绪，请稍后手动检查: docker compose ps"
  }
} else {
  Write-Err "Docker 服务启动失败:"
  Write-Host $composeResult -ForegroundColor Red
  $script:ExitCode = 1
}

# ──────────────────────────────────────────────
# 9. 等待模型服务
# ──────────────────────────────────────────────
Write-Step "检查模型推理服务..."
$modelOk = $false
try {
  $resp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -TimeoutSec 5 -UseBasicParsing
  if ($resp.StatusCode -eq 200) {
    $modelOk = $true
    Write-OK "模型推理服务已在运行（端口 5000）"
  }
} catch {}
if (-not $modelOk) {
  Write-Host "    模型推理服务未运行，正在启动..." -ForegroundColor Yellow
  try {
    $proc = Start-Process -FilePath $condaPython -ArgumentList "$modelDir\model_service2.py" -PassThru -NoNewWindow
    Start-Sleep -Seconds 8
    try {
      $resp = Invoke-WebRequest -Uri "http://127.0.0.1:5000/health" -TimeoutSec 5 -UseBasicParsing
      if ($resp.StatusCode -eq 200) {
        Write-OK "模型推理服务已启动（PID: $($proc.Id)）"
      }
    } catch {
      Write-Warn "模型推理服务启动中，请稍后手动检查: http://127.0.0.1:5000/health"
    }
  } catch {
    Write-Err "启动模型推理服务失败: $_"
    $script:ExitCode = 1
  }
}

# ──────────────────────────────────────────────
# 10. 构建 Release APK
# ──────────────────────────────────────────────
Write-Step "构建 Release APK..."
# 复用独立的 build-apk-lan.ps1，避免在此重复维护一套构建逻辑
$apkBuildScript = Join-Path $projectRoot "build-apk-lan.ps1"

if (-not (Test-Path $apkBuildScript)) {
  Write-Warn "未找到 build-apk-lan.ps1，跳过 APK 构建"
} else {
  Write-Host "    准备构建 APK，这将需要 3-8 分钟..." -ForegroundColor Gray
  $choice = Read-Host "    是否立即构建 APK？[Y/n]"
  if ($choice -eq 'n' -or $choice -eq 'N') {
    Write-Warn "跳过 APK 构建。稍后可运行: .\build-apk-lan.ps1 -LanIP $lanIP -Port $backendPort"
  } else {
    try {
      & $apkBuildScript -LanIP $lanIP -Port $backendPort
    } catch {
      Write-Err "APK 构建脚本执行失败: $_"
      $script:ExitCode = 1
    }
  }
}

# ──────────────────────────────────────────────
# 11. 部署摘要
# ──────────────────────────────────────────────
Write-Step "部署摘要"
Write-Host ""
Write-Host "  ┌────────────────────────────────────────────────────────────┐" -ForegroundColor Green
Write-Host "  │              棉花智能识别系统 — 部署完成                    │" -ForegroundColor Green
Write-Host "  ├────────────────────────────────────────────────────────────┤" -ForegroundColor Green
Write-Host "  │  后端地址:        http://$lanIP`:$backendPort                          │" -ForegroundColor Green
Write-Host "  │  健康检查:        http://$lanIP`:$backendPort/health                    │" -ForegroundColor Green
Write-Host "  │  模型服务:        http://127.0.0.1:5000/health            │" -ForegroundColor Green
Write-Host "  │  Docker 状态:     docker compose ps                        │" -ForegroundColor Green
Write-Host "  │  部署日志:        $deployLog          │" -ForegroundColor Green
Write-Host "  └────────────────────────────────────────────────────────────┘" -ForegroundColor Green
Write-Host ""
Write-Host "  手机端配置:" -ForegroundColor Yellow
Write-Host "    1. 手机连接与电脑同一个 WiFi" -ForegroundColor White
Write-Host "    2. 用浏览器打开 http://$lanIP`:$backendPort/health 确认可访问" -ForegroundColor White
Write-Host "    3. 安装 APK 后即可使用" -ForegroundColor White
Write-Host ""
Write-Host "  如果需要重新构建 APK（IP 变动后）:" -ForegroundColor White
Write-Host "    .\build-apk-lan.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "  开机自启说明:" -ForegroundColor White
Write-Host "    - Docker Desktop 会在您登录时自动启动" -ForegroundColor White
Write-Host "    - 模型推理服务（计划任务 'CottonRecognition_ModelService'）会在您登录时自动启动" -ForegroundColor White
Write-Host "    - Docker 容器（backend + mysql）会自动跟随 Docker 启动（restart: unless-stopped）" -ForegroundColor White
Write-Host ""

if ($script:ExitCode -ne 0) {
  Write-Err "部署过程有部分异常，请检查上面的 WARN/ERR 信息"
}
exit $script:ExitCode