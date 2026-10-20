$ErrorActionPreference='Stop'
try {
  $inputData=[Console]::In.ReadToEnd() | ConvertFrom-Json
  $target=[uri]$inputData.url
  if($target.Scheme -ne 'https' -or $target.Host -ne 'www.xiaohongshu.com' -or $target.UserInfo -or -not $target.IsDefaultPort -or $target.AbsolutePath -notmatch '^/(discovery/item|explore)/[a-fA-F0-9]{24}/?$'){exit 2}
  $response=Invoke-WebRequest -Uri $target.AbsoluteUri -TimeoutSec 30 -MaximumRedirection 0
  if($response.StatusCode -ne 200){exit 2}
  [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
  [Console]::Write($response.Content)
} catch { exit 2 }
