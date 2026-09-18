<#
.SYNOPSIS
  棉花智能识别系统 — APK 构建脚本
  用指定的局域网 IP 重新构建 Release APK
.DESCRIPTION
  在 Windows 开发机上运行（需要 Android SDK）。
  用法: .\build-apk-lan.ps1 [-LanIP "192.168.1.100"] [-Port 8088]
.EXAMPLE
  .\build-apk-lan.ps1 -LanIP "192.168.1.100"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$LanIP,
  [int]$Port = 8088
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidDir = Join-Path $projectRoot "apps\android"
$apkName = "cotton-recognition-$LanIP.apk"

Write-Host "==> 为局域网 IP $LanIP 构建 Release APK ..." -ForegroundColor Cyan

# 写入 .env.local
$envLocal = @"
EXPO_PUBLIC_API_BASE_URL=http://$LanIP`:$Port
EXPO_PUBLIC_REQUEST_TIMEOUT_MS=15000
EXPO_PUBLIC_RECOGNITION_TIMEOUT_MS=180000
EXPO_PUBLIC_RECOGNITION_UPLOAD_FIELD_NAME=file
"@

$envLocalPath = Join-Path $androidDir ".env.local"
Set-Content -Path $envLocalPath -Value $envLocal -Encoding UTF8
Write-Host "  [OK] .env.local 已配置 API_BASE_URL=http://${LanIP}:${Port}" -ForegroundColor Green

# 清理旧的构建
$buildDir = Join-Path $androidDir "android\app\build"
if (Test-Path $buildDir) {
  Remove-Item -Recurse -Force $buildDir -ErrorAction SilentlyContinue
  Write-Host "  [OK] 清理旧构建缓存" -ForegroundColor Green
}

# 执行 Gradle 构建
Set-Location (Join-Path $androidDir "android")
Write-Host "  正在构建，约需 3-8 分钟..." -ForegroundColor Yellow

$proc = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "assembleRelease" -NoNewWindow -PassThru -Wait
if ($proc.ExitCode -eq 0) {
  $apkPath = Get-ChildItem -Recurse -Filter "*.apk" (Join-Path $androidDir "android\app\build\outputs\apk") | Select-Object -First 1
  if ($apkPath) {
    $dest = Join-Path $projectRoot $apkName
    Copy-Item $apkPath.FullName $dest -Force
    Write-Host "  [OK] APK 已生成: $dest ($([math]::Round((Get-Item $dest).Length/1MB,1)) MB)" -ForegroundColor Green
    Write-Host "  [OK] 安装: adb install $dest" -ForegroundColor Green
    return $dest
  } else {
    Write-Error "APK 构建成功但未找到输出文件"
    exit 1
  }
} else {
  Write-Error "APK 构建失败（exit code: $($proc.ExitCode)）"
  Write-Host "查看详细日志: $(Join-Path $androidDir "android\app\build\outputs\logs")" -ForegroundColor Yellow
  exit 1
}