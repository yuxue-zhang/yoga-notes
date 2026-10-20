param([Parameter(Mandatory=$true)][ValidatePattern('^BV[A-Za-z0-9]{10}$')][string]$Bvid)
$ErrorActionPreference='Stop'
try {
  $response=Invoke-WebRequest -Uri ('https://www.bilibili.com/video/'+$Bvid+'/') -TimeoutSec 30 -MaximumRedirection 0
  if ($response.StatusCode -ne 200) { exit 2 }
  [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
  [Console]::Write($response.Content)
} catch { exit 2 }
