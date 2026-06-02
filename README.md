# Self-Hosted Outline Server Kit

This project deploys a self-hosted Outline Server on an Ubuntu VPS using Docker. It is intended for legal, defensive, privacy-oriented use on networks where you are authorized to use a VPN or encrypted proxy.

It does not include exploit, credential-abuse, packet-injection, MITM, phishing, or bypass techniques. Do not use it to evade school, employer, or provider policies.

## What It Builds

- Outline Server using `quay.io/outline/shadowbox:stable`
- Docker Compose service with automatic restart
- UFW firewall rules
- fail2ban for SSH protection
- unattended security updates
- self-signed management API certificate
- generated Outline Manager admin config
- generated default Windows client access URL when the management API is reachable
- backup, update, verification, and optional cron maintenance scripts

## Recommended VPS

Start with Oracle Cloud Free Tier if you can tolerate the signup and capacity limits:

- Shape: Ampere A1 flexible or tiny AMD shape
- RAM: 1 GB minimum, 2 GB comfortable
- Disk: 20 GB minimum
- Bandwidth: generous for light personal use, but subject to Oracle policy and regional availability

Low-cost alternatives:

- Hetzner, where available: strong value and reliable network
- Vultr, Linode/Akamai, DigitalOcean: easy setup, usually more expensive
- BuyVM, GreenCloudVPS, RackNerd: very low-cost options, quality varies by location and stock

Tradeoffs:

- Free tiers can disappear, throttle, or have scarce capacity.
- Cheapest VPS plans may have noisy neighbors.
- A nearby VPS usually improves latency more than extra CPU.
- Outline is lightweight; network quality matters more than raw compute.

## Server Requirements

- Ubuntu 22.04 preferred
- root or sudo SSH access
- public IPv4 address
- inbound TCP/UDP on the configured Outline access port, default `443`
- inbound TCP on the management API port, default `8443`
- Docker allowed by the provider

## Quick Start

Copy this folder to the VPS:

```bash
scp -r outline-kit root@YOUR_SERVER_IP:/opt/outline-kit
```

On the VPS:

```bash
cd /opt/outline-kit
sudo bash setup.sh
sudo bash deploy.sh
```

The admin config is written to:

```text
exports/outline_manager_access.txt
```

If the API call succeeds, the first Windows client access URL is written to:

```text
exports/windows-client-1-access-url.txt
```

## Configuration

Edit `.env` after `setup.sh` creates it:

```bash
sudo nano .env
```

Important settings:

- `OUTLINE_HOSTNAME`: public IP or DNS name clients use
- `OUTLINE_KEYS_PORT`: client access port, default `443`
- `OUTLINE_API_PORT`: management API port, default `8443`
- `ADMIN_CIDR`: optional trusted admin IP range for SSH and management API
- `SSH_PORT`: SSH port if you changed it

For best security, set `ADMIN_CIDR` to your home or admin VPN IP range before running `setup.sh`. If you leave it empty, SSH and the management API are open to the internet, protected only by SSH auth and the secret Outline API path/certificate.

## Ports

Default exposed ports:

- `22/tcp`: SSH, or your custom `SSH_PORT`
- `8443/tcp`: Outline management API
- `443/tcp`: Outline access
- `443/udp`: Outline access

Cloud firewalls/security lists must match UFW. On Oracle Cloud, update both the VCN security list or NSG and the instance firewall.

## Reliability Notes

Use stable, common infrastructure:

- Prefer a reputable VPS region near you.
- Prefer DNS from the client OS or a trusted resolver such as Cloudflare, Quad9, or your provider.
- Keep access on a single well-supported port unless you have a clear operational reason to change it.
- If connections work on cellular but not on a managed school or enterprise network, assume policy enforcement and use only authorized networks.

Outline uses Shadowsocks and is not a full-device corporate VPN appliance. It is good for personal privacy and basic traffic protection, but it should not be treated as an enterprise access-control boundary.

## Operations

Verify:

```bash
sudo bash verify.sh
```

Backup:

```bash
sudo bash backup.sh
```

Update:

```bash
sudo bash update.sh
```

Optional scheduled maintenance:

```bash
sudo bash install_cron.sh
```

## Restore From Backup

Stop the service:

```bash
sudo docker compose down
```

Extract the backup from the project directory:

```bash
sudo tar -xzf backups/outline-backup-YYYYMMDDTHHMMSSZ.tar.gz -C .
sudo docker compose up -d
sudo bash verify.sh
```

## Files

- `setup.sh`: installs dependencies and hardens the host
- `deploy.sh`: starts Outline and exports admin/client configs
- `verify.sh`: checks Docker, ports, firewall, and API
- `backup.sh`: archives persisted state and exports
- `update.sh`: backs up, pulls the latest image, restarts, verifies
- `start.sh`: starts, stops, restarts, or shows status
- `install_cron.sh`: optional daily backup and weekly update
- `docker-compose.yml`: Outline container definition
- `windows_client_setup.md`: Windows client workflow
- `aws_lightsail_setup.md`: step-by-step AWS Lightsail deployment guide
- `vpn-portal/`: static commercial portal MVP for landing, onboarding, and client dashboard design
- `backend/`: protected API MVP for Outline access-key operations
- `troubleshooting.md`: common fixes
- `security_notes.md`: risk and hardening notes

## Sources Checked

The Compose setup follows the current Outline Shadowbox container pattern: the stable image is hosted at Quay, the management API uses `SB_API_PORT` and a secret `SB_API_PREFIX`, and persisted state is stored under the Shadowbox persisted-state directory. See [Outline Help: How Outline Works](https://support.getoutline.org/about/how-outline-works) and the [Jigsaw-Code Outline Server repository](https://github.com/Jigsaw-Code/outline-server).
