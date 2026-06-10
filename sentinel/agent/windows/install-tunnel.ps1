param(
  [Parameter(Mandatory = $true)]
  [string]$SshKeyPath,

  [string]$SshHost = "35.172.31.23",
  [string]$SshUser = "ubuntu",
  [int]$LocalPort = 8787,
  [string]$RemoteHost = "127.0.0.1",
  [int]$RemotePort = 8787,
  [string]$InstallDir = "$env:ProgramData\OrbitSentinel",
  [string]$TaskName = "ORBIT Sentinel Tunnel"
)

$ErrorActionPreference = "Stop"

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this installer from PowerShell as Administrator."
  }
}

function Protect-ConfigFile {
  param([string]$Path)

  $acl = Get-Acl -LiteralPath $Path
  $acl.SetAccessRuleProtection($true, $false)
  $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }

  $currentUserSid = [Security.Principal.WindowsIdentity]::GetCurrent().User
  $adminSid = New-Object Security.Principal.SecurityIdentifier("S-1-5-32-544")
  $systemSid = New-Object Security.Principal.SecurityIdentifier("S-1-5-18")

  foreach ($account in @($currentUserSid, $adminSid, $systemSid)) {
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
      $account,
      "Read",
      "Allow"
    )
    $acl.AddAccessRule($rule)
  }

  Set-Acl -LiteralPath $Path -AclObject $acl
}

Assert-Administrator

$resolvedKey = Resolve-Path -LiteralPath $SshKeyPath
$sourceTunnel = Join-Path $PSScriptRoot "sentinel-tunnel.ps1"
if (-not (Test-Path -LiteralPath $sourceTunnel)) {
  throw "Cannot find sentinel-tunnel.ps1 beside installer."
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

$tunnelPath = Join-Path $InstallDir "sentinel-tunnel.ps1"
$configPath = Join-Path $InstallDir "tunnel-config.json"
Copy-Item -LiteralPath $sourceTunnel -Destination $tunnelPath -Force

$config = @{
  SshHost = $SshHost
  SshUser = $SshUser
  SshKeyPath = $resolvedKey.Path
  LocalPort = $LocalPort
  RemoteHost = $RemoteHost
  RemotePort = $RemotePort
} | ConvertTo-Json -Depth 4

Set-Content -LiteralPath $configPath -Value $config -Encoding UTF8
Protect-ConfigFile -Path $configPath

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$tunnelPath`""

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn
$intervalTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes 5) `
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

Write-Host "ORBIT Sentinel tunnel installed."
Write-Host "Tunnel: $tunnelPath"
Write-Host "Config: $configPath"
Write-Host "Task: $TaskName"
Write-Host "Run now with:"
Write-Host "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$tunnelPath`""
