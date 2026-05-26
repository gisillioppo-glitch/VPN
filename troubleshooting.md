# Troubleshooting

## Deployment Fails During Docker Install

Run:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo bash setup.sh
```

If the server cannot reach Docker repositories, check provider DNS, outbound HTTPS, and whether the VPS image has broken apt sources.

## Container Is Not Running

```bash
sudo docker compose ps
sudo docker logs --tail=200 outline-server
```

Common causes:

- `.env` has an empty or malformed `OUTLINE_API_PREFIX`
- access port already used by another service
- Docker daemon is not running
- persisted-state directory has incorrect permissions

Fix permissions:

```bash
sudo chown -R root:root data
sudo chmod 700 data/persisted-state
sudo docker compose up -d
```

## Ports Are Not Reachable

Check local firewall:

```bash
sudo ufw status verbose
sudo ss -lntup
```

Then check the provider firewall. Oracle Cloud requires VCN security list or NSG ingress rules in addition to UFW.

Required defaults:

- `443/tcp`
- `443/udp`
- `8443/tcp` from your admin IP, if possible
- `22/tcp` from your admin IP, if possible

## Outline Manager Cannot Add The Server

Use the exact JSON from:

```text
exports/outline_manager_access.txt
```

If the file is missing:

```bash
sudo bash deploy.sh
```

If the management API is blocked by your cloud firewall, temporarily allow `OUTLINE_API_PORT` from your current IP, add the server to Outline Manager, then restrict it again.

## Client Key Does Not Connect

Check:

```bash
sudo bash verify.sh
sudo docker logs --tail=100 outline-server
```

Then test from a different network such as a mobile hotspot. If it works on one network and not another, the failing network may intentionally restrict VPN/proxy traffic. Use only networks where you have permission.

## DNS Is Slow Or Unreliable

On Windows, return DNS to automatic first. If you need a known resolver, use one reputable provider consistently:

- Cloudflare: `1.1.1.1`, `1.0.0.1`
- Quad9: `9.9.9.9`, `149.112.112.112`
- Google: `8.8.8.8`, `8.8.4.4`

Changing DNS will not fix a server-side firewall problem.

## MTU Symptoms

Symptoms include pages partially loading, large downloads stalling, or video calls failing while simple pages work.

On the server, inspect the interface MTU:

```bash
ip link
```

On Windows, avoid changing MTU unless you have confirmed fragmentation problems. If required, test carefully and document the old value first:

```powershell
netsh interface ipv4 show subinterfaces
```

Most VPS and Windows networks work best with default MTU.

## Reboot Persistence

Test:

```bash
sudo reboot
```

After reconnecting:

```bash
cd /opt/outline-kit
sudo bash verify.sh
```

The Docker service and `restart: unless-stopped` policy should bring Outline back automatically.
