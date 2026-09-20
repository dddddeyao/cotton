<#
.SYNOPSIS
  棉花智能识别系统 — APK 构建脚本
.DESCRIPTION
  在 Windows 开发机上运行（需要 Android SDK）。

  两种用法：
  1) 通用版（推荐，一次打包到处用）：
       .\build-apk-lan.ps1
     不预置后端地址；App 首次启动会引导用户填写，或点「自动搜索服务器」。
     之后无论部署到哪台电脑，只要在 App 里改一下地址即可，无需重新打包。

  2) 指定地址版（开箱即用，但换电脑需重打）：
       .\build-apk-lan.ps1 -LanIP "192.168.1.100" -Port 8088
.EXAMPLE
  .\build-apk-lan.ps1
  .\build-apk-lan.ps1 -LanIP "192.168.1.100"
#>
param(
  [string]$LanIP = '',
  [int]$Port = 8088
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidDir = Join-Path $projectRoot "apps\android"

if ([string]::IsNullOrWhiteSpace($LanIP)) {
  $apiBaseUrl = ''
  $apkName = "cotton-recognition.apk"
  Write-Host "==> 构建【通用版】Release APK（不预置服务器地址）..." -ForegroundColor Cyan
  Write-Host "    安装后首次打开会引导填写 / 自动搜索服务器地址" -ForegroundColor Gray
} else {
  $LanIP = $LanIP.Trim()
  $apiBaseUrl = "http://${LanIP}:${Port}"
  $apkName = "cotton-recognition-$LanIP.apk"
  Write-Host "==> 为局域网 IP $LanIP 构建 Release APK ..." -ForegroundColor Cyan
}

# 写入 .env.local
$envLocal = @"
EXPO_PUBLIC_API_BASE_URL=$apiBaseUrl
EXPO_PUBLIC_REQUEST_TIMEOUT_MS=15000
EXPO_PUBLIC_RECOGNITION_TIMEOUT_MS=180000
EXPO_PUBLIC_RECOGNITION_UPLOAD_FIELD_NAME=file
"@

$envLocalPath = Join-Path $androidDir ".env.local"
Set-Content -Path $envLocalPath -Value $envLocal -Encoding UTF8
if ($apiBaseUrl) {
  Write-Host "  [OK] .env.local 已配置 API_BASE_URL=$apiBaseUrl" -ForegroundColor Green
} else {
  Write-Host "  [OK] .env.local 已写入（API_BASE_URL 留空，改由 App 内配置）" -ForegroundColor Green
}

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
    # 签名校验：避免把 debug 签名的包当成正式包交付
    $sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { 'E:\Android' }
    $apksigner = Get-ChildItem (Join-Path $sdkRoot 'build-tools') -Directory -ErrorAction SilentlyContinue |
      Sort-Object Name -Descending | Select-Object -First 1 |
      ForEach-Object { Join-Path $_.FullName 'apksigner.bat' }
    if ($apksigner -and (Test-Path $apksigner)) {
      $certLine = & $apksigner verify --print-certs $dest 2>&1 | Select-String 'certificate DN' | Select-Object -First 1
      if ($certLine -match 'Android Debug') {
        Write-Host "  [WARN] 当前 APK 使用的是 debug 签名，仅适合内部测试，不能作为正式交付包！" -ForegroundColor Yellow
        Write-Host "        请检查 apps\android\android\keystore.properties（storeFile 建议写成 E:/path/to.keystore）" -ForegroundColor Yellow
        Write-Host "        或设置环境变量 COTTON_KEYSTORE_FILE / COTTON_KEYSTORE_PASSWORD / COTTON_KEY_ALIAS / COTTON_KEY_PASSWORD" -ForegroundColor Yellow
      } elseif ($certLine) {
        Write-Host "  [OK] 签名证书:$certLine" -ForegroundColor Green
      }
    } else {
      Write-Host "  [WARN] 未找到 apksigner，跳过签名校验" -ForegroundColor Yellow
    }

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
