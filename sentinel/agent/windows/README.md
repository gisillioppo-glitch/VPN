# ORBIT Sentinel Windows Agent

This is the first Windows collector for ORBIT Sentinel. It reports a small set
of defensive signals to the private ORBIT backend:

- Agent start.
- Public IP and ORBIT VPN public-IP check.
- Windows Firewall status.
- Windows Defender status.
- Local administrator group count.

It does not read email, messages, browser history, passwords, files, or private
content.

## Network Model

For the MVP, keep the ORBIT backend private. Do not open the Sentinel API to the
public internet yet.

Use an SSH tunnel from Windows to the VPS when testing:

```powershell
cd "$env:USERPROFILE\OneDrive\Escritorio\VPN Data"
ssh -N -L 8787:127.0.0.1:8787 -i ".\LightsailDefaultKey-us-east-1.pem" ubuntu@35.172.31.23
```

Keep that PowerShell window open. In another PowerShell window, the agent can
send events to:

```text
http://127.0.0.1:8787
```

Later, this can move to Cloudflare Tunnel or another HTTPS access layer.

For a stable private MVP without a domain, install the automatic tunnel task.
It keeps `127.0.0.1:8787` connected to the private backend without leaving a
PowerShell window open.

## Install

Run PowerShell as Administrator from this folder:

```powershell
.\install-agent.ps1 `
  -DeviceId "DEVICE_ID" `
  -DeviceToken "DEVICE_TOKEN" `
  -ApiBaseUrl "http://127.0.0.1:8787"
```

The installer copies the agent to:

```text
C:\ProgramData\OrbitSentinel
```

It also creates a scheduled task named:

```text
ORBIT Sentinel Agent
```

The task runs at logon and then every 15 minutes while the user session is
available.

## Install Automatic SSH Tunnel

Run PowerShell as Administrator from this folder:

```powershell
.\install-tunnel.ps1 `
  -SshKeyPath "$env:USERPROFILE\OneDrive\Escritorio\VPN Data\LightsailDefaultKey-us-east-1.pem"
```

The installer copies the tunnel helper to:

```text
C:\ProgramData\OrbitSentinel\sentinel-tunnel.ps1
```

It also creates a scheduled task named:

```text
ORBIT Sentinel Tunnel
```

The task runs at logon and every 5 minutes. If the local tunnel is already
active, it exits quietly. If the tunnel is down, it starts `ssh.exe` hidden.

Manual tunnel run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:ProgramData\OrbitSentinel\sentinel-tunnel.ps1"
```

Verify local API through the tunnel:

```powershell
curl.exe http://127.0.0.1:8787/health
```

Expected:

```json
{"status":"ok","service":"orbit-outline-backend"}
```

## Manual Run

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$env:ProgramData\OrbitSentinel\sentinel-agent.ps1"
```

## Verify On The VPS

Inside the VPS:

```bash
cd /opt/outline-kit/backend
set -a
. ./.env
set +a

curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/sentinel/events | jq
```

## Security Notes

- Keep `DEVICE_TOKEN` private.
- Do not paste device tokens into chat.
- If a token leaks, block the device and enroll a new one.
- Keep the API private until HTTPS and an explicit access layer are configured.
- The agent is defensive and owner-authorized only.
- The SSH key path in `tunnel-config.json` is sensitive because it points to
  the private VPS key. Keep `C:\ProgramData\OrbitSentinel` readable only by the
  owner, administrators, and SYSTEM.
