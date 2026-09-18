<#
把本机图片批量推送进 Android 模拟器。

说明：
- 直接往模拟器窗口拖拽图片经常无效（不同模拟器版本对拖放支持不一致）。
- adb push 之后必须触发媒体扫描，否则系统相册和 App 的图片选择器看不到这些图片。

用法：
  powershell -ExecutionPolicy Bypass -File .\push-images.ps1 -Source "C:\Users\77870\Pictures\棉花"

  只推一个文件夹到相册目录：
  powershell -ExecutionPolicy Bypass -File .\push-images.ps1 -Source "D:\棉花照片" -RemoteDir /sdcard/Pictures

  指定设备（多开模拟器时）：
  powershell -ExecutionPolicy Bypass -File .\push-images.ps1 -Source "D:\棉花照片" -Device emulator-5554

  只推不扫（不推荐）：
  powershell -ExecutionPolicy Bypass -File .\push-images.ps1 -Source "D:\棉花照片" -SkipMediaScan
#>
param(
  [Parameter(Mandatory = $true)][string]$Source,
  [string]$RemoteDir = '/sdcard/Pictures',
  [string]$Device = '',
  [switch]$SkipMediaScan
)

$ErrorActionPreference = 'Stop'
$imageExtensions = @('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.heic', '.heif')

function Find-Adb {
  $cmd = Get-Command adb -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    'E:\Android\platform-tools\adb.exe',
    (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'),
    'C:\Android\Sdk\platform-tools\adb.exe'
  )
  foreach ($path in $candidates) {
    if ($path -and (Test-Path $path)) { return $path }
  }
  throw '未找到 adb，请确认已安装 Android SDK Platform-Tools。'
}

$adb = Find-Adb
Write-Host "adb: $adb"

$deviceArgs = @()
if ($Device) { $deviceArgs = @('-s', $Device) }

$online = & $adb devices | Select-String -Pattern '\sdevice$'
if (-not $online) { throw '没有在线的模拟器/设备，请先启动模拟器。' }

if (-not $Device) {
  $Device = (($online | Select-Object -First 1) -split '\s+')[0]
  $deviceArgs = @('-s', $Device)
}
Write-Host "目标设备: $Device"

$files = @()
if (Test-Path -Path $Source -PathType Container) {
  $files = @(Get-ChildItem -Path $Source -File -Recurse |
    Where-Object { $imageExtensions -contains $_.Extension.ToLower() })
} elseif (Test-Path -Path $Source -PathType Leaf) {
  $files = @(Get-Item -Path $Source)
} else {
  throw "路径不存在: $Source"
}

if ($files.Count -eq 0) { throw "没有找到图片文件: $Source" }
Write-Host ("找到 " + $files.Count + " 张图片，开始推送 ...")

& $adb @deviceArgs shell mkdir -p $RemoteDir | Out-Null

$index = 0
foreach ($file in $files) {
  $index++
  $remotePath = "$RemoteDir/$($file.Name)"
  & $adb @deviceArgs push $file.FullName $remotePath | Out-Null

  if (-not $SkipMediaScan) {
    # 触发媒体扫描，让相册与图片选择器立即看到新图片
    & $adb @deviceArgs shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://$remotePath" | Out-Null
  }

  Write-Host ("[{0}/{1}] {2}" -f $index, $files.Count, $file.Name)
}

Write-Host ''
Write-Host "完成，模拟器 $RemoteDir 目录内容："
& $adb @deviceArgs shell ls -l $RemoteDir
