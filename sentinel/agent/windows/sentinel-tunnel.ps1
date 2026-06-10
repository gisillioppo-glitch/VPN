param(
  [string]$ConfigPath = "$env:ProgramData\OrbitSentinel\tunnel-config.json"
)

$ErrorActionPreference = "Stop"

function Read-TunnelConfig {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Tunnel config not found: $Path"
  }

  $config = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  foreach ($field in @("SshHost", "SshUser", "SshKeyPath", "LocalPort", "RemoteHost", "RemotePort")) {
    if (-not $config.$field) {
      throw "Missing required tunnel config field: $field"
    }
  }

  return $config
}

function Test-LocalPort {
  param([int]$Port)

  try {
    $client = [Net.Sockets.TcpClient]::new()
    $connection = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    $connected = $connection.AsyncWaitHandle.WaitOne(1000, $false)
    if ($connected) {
      $client.EndConnect($connection)
    }
    $client.Close()
    return $connected
  } catch {
    return $false
  }
}

function Start-SentinelTunnel {
  param([object]$Config)

  $sshArgs = @(
    "-N",
    "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=3",
    "-o", "IdentitiesOnly=yes",
    "-L", "$($Config.LocalPort):$($Config.RemoteHost):$($Config.RemotePort)",
    "-i", "$($Config.SshKeyPath)",
    "$($Config.SshUser)@$($Config.SshHost)"
  )

  Start-Process `
    -FilePath "ssh.exe" `
    -ArgumentList $sshArgs `
    -WindowStyle Hidden `
    -PassThru | Out-Null
}

$config = Read-TunnelConfig -Path $ConfigPath
$localPort = [int]$config.LocalPort

if (Test-LocalPort -Port $localPort) {
  Write-Host "Sentinel tunnel already active on 127.0.0.1:$localPort"
  exit 0
}

Start-SentinelTunnel -Config $config
Start-Sleep -Seconds 3

if (-not (Test-LocalPort -Port $localPort)) {
  throw "Sentinel tunnel did not become active on 127.0.0.1:$localPort"
}

Write-Host "Sentinel tunnel active on 127.0.0.1:$localPort"
