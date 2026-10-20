$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$isRunning = $false
try { $isRunning = (Invoke-WebRequest -Uri 'http://127.0.0.1:8787/api/config' -TimeoutSec 2).StatusCode -eq 200 } catch {}
if (-not $isRunning) {
  $nodePath = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
  if (-not $nodePath) { throw '未找到 Node.js，请联系开发者处理。' }
  Start-Process -FilePath 'pwsh.exe' -ArgumentList '-NoProfile','-File',('"' + (Join-Path $PSScriptRoot 'start.ps1') + '"') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  for ($attempt=0; $attempt -lt 20; $attempt++) {
    try { if ((Invoke-WebRequest -Uri 'http://127.0.0.1:8787/api/config' -TimeoutSec 1).StatusCode -eq 200) { $isRunning=$true; break } } catch {}
    Start-Sleep -Milliseconds 500
  }
}
if (-not $isRunning) { throw '瑜序没有启动成功，请联系开发者处理。' }
Start-Process 'http://127.0.0.1:8787/'
