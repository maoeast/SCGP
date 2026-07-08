param(
  [string]$UserDataDir = "",
  [switch]$ResetTrial
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$nodeCommand = "node"

$arguments = @(
  (Join-Path $scriptDir 'reset-activation-only.mjs')
)

if ($UserDataDir) {
  $arguments += @('--user-data-dir', $UserDataDir)
}

if ($ResetTrial) {
  $arguments += '--reset-trial'
}

Write-Host "正在清除激活信息..." -ForegroundColor Cyan
Write-Host "仓库目录: $repoRoot"
if ($UserDataDir) {
  Write-Host "目标 userData 目录: $UserDataDir"
} else {
  Write-Host "目标 userData 目录: 默认 APPDATA\\scgp"
}
Write-Host "重置试用起点: $($ResetTrial.IsPresent)"

Push-Location $repoRoot
try {
  & $nodeCommand @arguments
} finally {
  Pop-Location
}
