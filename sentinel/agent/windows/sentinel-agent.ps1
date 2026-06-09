param(
  [string]$ConfigPath = "$env:ProgramData\OrbitSentinel\config.json"
)

$ErrorActionPreference = "Stop"

function Read-SentinelConfig {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Sentinel config not found: $Path"
  }

  $config = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  foreach ($field in @("ApiBaseUrl", "DeviceId", "DeviceToken")) {
    if (-not $config.$field) {
      throw "Missing required Sentinel config field: $field"
    }
  }

  return $config
}

function Send-SentinelEvent {
  param(
    [object]$Config,
    [string]$Severity,
    [string]$EventType,
    [string]$Summary,
    [hashtable]$Details = @{}
  )

  $uri = ($Config.ApiBaseUrl.TrimEnd("/")) + "/api/sentinel/events"
  $headers = @{
    "X-Sentinel-Device-Id" = [string]$Config.DeviceId
    "X-Sentinel-Device-Token" = [string]$Config.DeviceToken
  }
  $body = @{
    severity = $Severity
    eventType = $EventType
    summary = $Summary
    details = $Details
  } | ConvertTo-Json -Depth 6

  try {
    Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json" -Body $body | Out-Null
  } catch {
    Write-Warning "Could not send Sentinel event '$EventType': $($_.Exception.Message)"
  }
}

function Get-PublicIp {
  try {
    return (Invoke-RestMethod -Uri "https://ifconfig.me" -TimeoutSec 8).Trim()
  } catch {
    return ""
  }
}

function Get-FirewallSummary {
  try {
    $profiles = Get-NetFirewallProfile | Select-Object Name, Enabled
    $disabled = @($profiles | Where-Object { -not $_.Enabled })
    return @{
      available = $true
      disabledProfileCount = $disabled.Count
      allEnabled = ($disabled.Count -eq 0)
    }
  } catch {
    return @{
      available = $false
      error = $_.Exception.Message
    }
  }
}

function Get-DefenderSummary {
  try {
    $status = Get-MpComputerStatus
    return @{
      available = $true
      realTimeProtectionEnabled = [bool]$status.RealTimeProtectionEnabled
      antispywareEnabled = [bool]$status.AntispywareEnabled
      antivirusEnabled = [bool]$status.AntivirusEnabled
    }
  } catch {
    return @{
      available = $false
      error = $_.Exception.Message
    }
  }
}

function Get-LocalAdminSummary {
  try {
    $members = @(Get-LocalGroupMember -Group "Administrators" -ErrorAction Stop)
    return @{
      available = $true
      count = $members.Count
    }
  } catch {
    return @{
      available = $false
      error = $_.Exception.Message
    }
  }
}

$config = Read-SentinelConfig -Path $ConfigPath
$orbitVpnIp = if ($config.OrbitVpnIp) { [string]$config.OrbitVpnIp } else { "35.172.31.23" }

Send-SentinelEvent `
  -Config $config `
  -Severity "informational" `
  -EventType "agent.started" `
  -Summary "Sentinel agent started on Windows" `
  -Details @{
    agentVersion = "0.1.0"
    computerName = $env:COMPUTERNAME
    userName = $env:USERNAME
    powershellVersion = $PSVersionTable.PSVersion.ToString()
  }

$publicIp = Get-PublicIp
$orbitConnected = ($publicIp -eq $orbitVpnIp)
Send-SentinelEvent `
  -Config $config `
  -Severity "informational" `
  -EventType $(if ($orbitConnected) { "vpn.orbit_connected" } else { "vpn.orbit_disconnected" }) `
  -Summary $(if ($orbitConnected) { "ORBIT VPN public IP detected" } else { "ORBIT VPN public IP not detected" }) `
  -Details @{
    publicIp = $publicIp
    expectedOrbitIp = $orbitVpnIp
  }

$firewall = Get-FirewallSummary
Send-SentinelEvent `
  -Config $config `
  -Severity $(if ($firewall.available -and -not $firewall.allEnabled) { "suspicious" } else { "informational" }) `
  -EventType "windows.firewall_status" `
  -Summary $(if ($firewall.available -and -not $firewall.allEnabled) { "One or more Windows Firewall profiles are disabled" } else { "Windows Firewall status checked" }) `
  -Details $firewall

$defender = Get-DefenderSummary
$defenderHealthy = $defender.available -and $defender.realTimeProtectionEnabled -and $defender.antivirusEnabled
Send-SentinelEvent `
  -Config $config `
  -Severity $(if ($defender.available -and -not $defenderHealthy) { "critical" } else { "informational" }) `
  -EventType "windows.defender_status" `
  -Summary $(if ($defender.available -and -not $defenderHealthy) { "Windows Defender protection appears disabled" } else { "Windows Defender status checked" }) `
  -Details $defender

$admins = Get-LocalAdminSummary
Send-SentinelEvent `
  -Config $config `
  -Severity "informational" `
  -EventType "windows.local_admin_summary" `
  -Summary "Local administrator group summary checked" `
  -Details $admins
