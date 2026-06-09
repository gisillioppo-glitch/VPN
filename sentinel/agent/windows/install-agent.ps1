param(
  [Parameter(Mandatory = $true)]
  [string]$DeviceId,

  [Parameter(Mandatory = $true)]
  [string]$DeviceToken,

  [string]$ApiBaseUrl = "http://127.0.0.1:8787",
  [string]$OrbitVpnIp = "35.172.31.23",
  [string]$InstallDir = "$env:ProgramData\OrbitSentinel",
  [string]$TaskName = "ORBIT Sentinel Agent"
)

$ErrorActionPreference = "Stop"

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this installer from PowerShell as Administrator."
  }
}

Assert-Administrator

$sourceAgent = Join-Path $PSScriptRoot "sentinel-agent.ps1"
if (-not (Test-Path -LiteralPath $sourceAgent)) {
  throw "Cannot find sentinel-agent.ps1 beside installer."
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

$agentPath = Join-Path $InstallDir "sentinel-agent.ps1"
$configPath = Join-Path $InstallDir "config.json"
Copy-Item -LiteralPath $sourceAgent -Destination $agentPath -Force

$config = @{
  ApiBaseUrl = $ApiBaseUrl
  DeviceId = $DeviceId
  DeviceToken = $DeviceToken
  OrbitVpnIp = $OrbitVpnIp
} | ConvertTo-Json -Depth 4

Set-Content -LiteralPath $configPath -Value $config -Encoding UTF8

$acl = Get-Acl -LiteralPath $configPath
$acl.SetAccessRuleProtection($true, $false)
$acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }
foreach ($account in @("$env:USERDOMAIN\$env:USERNAME", "BUILTIN\Administrators", "NT AUTHORITY\SYSTEM")) {
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $account,
    "Read",
    "Allow"
  )
  $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $configPath -AclObject $acl

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$agentPath`""

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$intervalTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Minutes 15) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger @($logonTrigger, $intervalTrigger) `
  -Principal $principal `
  -Settings $settings `
  -Force | Out-Null

Write-Host "ORBIT Sentinel installed."
Write-Host "Agent: $agentPath"
Write-Host "Config: $configPath"
Write-Host "Task: $TaskName"
Write-Host "Run now with:"
Write-Host "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$agentPath`""
