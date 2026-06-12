param(
  [string]$InstallDir = "$env:ProgramData\OrbitSentinel",
  [string]$AgentTaskName = "ORBIT Sentinel Agent",
  [string]$TunnelTaskName = "ORBIT Sentinel Tunnel"
)

$ErrorActionPreference = "Stop"

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Run this updater from PowerShell as Administrator."
  }
}

function Update-TaskAction {
  param(
    [string]$TaskName,
    [string]$ScriptPath
  )

  if (-not (Test-Path -LiteralPath $ScriptPath)) {
    Write-Warning "Skipping $TaskName because script is missing: $ScriptPath"
    return
  }

  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if (-not $task) {
    Write-Warning "Skipping missing scheduled task: $TaskName"
    return
  }

  $action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""

  Set-ScheduledTask -TaskName $TaskName -Action $action | Out-Null
  Write-Host "Updated task action: $TaskName"
}

Assert-Administrator

Update-TaskAction `
  -TaskName $AgentTaskName `
  -ScriptPath (Join-Path $InstallDir "sentinel-agent.ps1")

Update-TaskAction `
  -TaskName $TunnelTaskName `
  -ScriptPath (Join-Path $InstallDir "sentinel-tunnel.ps1")

Write-Host "ORBIT Sentinel scheduled tasks now run hidden."
