# AWS Lightsail Deployment Guide

This guide deploys the Outline kit on AWS Lightsail using Ubuntu 22.04 LTS.

Use this only on networks and devices where you are authorized to use a VPN or encrypted proxy.

## Block 1: AWS Plan

Recommended starting point:

- Service: Amazon Lightsail
- Region: closest stable region, usually `us-east-1`, `us-east-2`, or `us-west-2`
- OS: Ubuntu 22.04 LTS
- Instance name: `outline-vpn`
- Size: 1 GB RAM minimum recommended
- Static IP: yes

Why Lightsail:

- Predictable monthly pricing
- Simpler networking than raw EC2
- Built-in instance firewall
- Easy browser SSH for setup

## Block 2: Create The Instance

1. Open the AWS Console.
2. Search for `Lightsail`.
3. Choose `Create instance`.
4. Select Linux/Unix.
5. Select Ubuntu 22.04 LTS.
6. Choose the 1 GB RAM plan if available.
7. Name the instance `outline-vpn`.
8. Create the instance.

Wait until the instance status is `Running`.

## Block 3: Attach A Static IP

Lightsail dynamic public IPs can change after stop/start. Use a static IP.

1. In Lightsail, open `Networking`.
2. Create a static IP.
3. Attach it to `outline-vpn`.
4. Write down the static public IP.

## Block 4: Lightsail Firewall

Open only the ports needed.

Recommended inbound rules:

| Port | Protocol | Source | Purpose |
| --- | --- | --- | --- |
| 22 | TCP | Your admin IP only if possible | SSH |
| 443 | TCP | Anywhere IPv4 | Outline access |
| 443 | UDP | Anywhere IPv4 | Outline access |
| 8443 | TCP | Your admin IP only if possible | Outline Manager API |

If you do not know your current public IP, search `what is my IP` in your browser.

Security note: if you cannot restrict `22/tcp` and `8443/tcp` to your IP during the first pass, deploy first, verify, then tighten them.

## Block 5: SSH Into The Server

Use the Lightsail browser SSH button or your local terminal.

Browser SSH is easiest for the first setup.

## Block 6: Install From GitHub

Run:

```bash
sudo apt-get update
sudo apt-get install -y git
sudo git clone https://github.com/gisillioppo-glitch/VPN.git /opt/outline-kit
cd /opt/outline-kit
sudo bash setup.sh
sudo bash deploy.sh
```

## Block 7: Get The Client Files

After deployment:

```bash
sudo cat /opt/outline-kit/exports/outline_manager_access.txt
sudo cat /opt/outline-kit/exports/windows-client-1-access-url.txt
```

Do not post these values publicly.

## Block 8: Verify Server Health

Run:

```bash
cd /opt/outline-kit
sudo bash verify.sh
sudo docker compose ps
sudo ufw status verbose
```

Expected:

- Docker container is running
- ports `443/tcp`, `443/udp`, and `8443/tcp` are listening or allowed as configured
- Outline persisted state exists

## Block 9: Reboot Test

Run:

```bash
sudo reboot
```

Reconnect after 60 seconds:

```bash
cd /opt/outline-kit
sudo bash verify.sh
```

## Block 10: Windows Client

1. Install the official Outline Client for Windows.
2. Add a server.
3. Paste the access URL from `windows-client-1-access-url.txt`.
4. Connect.
5. Test:

```powershell
curl.exe https://ifconfig.me
nslookup example.com
```

The visible IP should be the Lightsail static IP.

## Cost Control

To avoid surprises:

- Use one small Lightsail instance.
- Use one static IP attached to the running instance.
- Delete unattached static IPs.
- Avoid snapshots unless you need them.
- Watch outbound bandwidth.

Outline is lightweight. For one or a few personal devices, CPU and RAM usage are usually low; bandwidth is the main variable.
