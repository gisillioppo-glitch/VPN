# ORBIT Outline Backend MVP

Small protected API for private beta requests, approval-based Outline access key
creation, and customer lifecycle operations.

This backend must run on a trusted server. Do not expose Outline Manager secrets
to the frontend.

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

On Ubuntu 22.04, `sqlite3` may need to be compiled locally so the native module
matches the server glibc version:

```bash
sudo apt-get update
sudo NEEDRESTART_MODE=a DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential python3 make g++
npm rebuild sqlite3 --build-from-source
```

Edit `.env`:

```text
ADMIN_TOKEN=long-random-admin-token
DB_PATH=./data/orbit.db
OUTLINE_API_URL=https://[::1]:8443/YOUR_SECRET_API_PREFIX
OUTLINE_CERT_SHA256=...
PUBLIC_PORTAL_ORIGIN=https://gisillioppo-glitch.github.io
SUPPORT_EMAIL=hello@orbitvpn.co
RESEND_API_KEY=
EMAIL_FROM=
ADMIN_NOTIFY_EMAIL=
```

The API URL and cert hash come from:

```text
/opt/outline-kit/exports/outline_manager_access.txt
```

Keep that file private.

If this backend runs on a different host from the Outline server, use the public
manager URL instead and allow that backend host through the server firewall.

## Run

```bash
npm start
```

## Install As A Service

After `.env` is configured and dependencies are installed:

```bash
sudo bash backend/install_systemd.sh
```

The service listens on `127.0.0.1:8787` by default and should not be exposed
directly to the public internet.

Useful commands:

```bash
sudo systemctl status orbit-backend --no-pager
sudo systemctl restart orbit-backend
sudo journalctl -u orbit-backend -n 100 --no-pager
```

## Local API

Health:

```bash
curl http://127.0.0.1:8787/health
```

Outline health:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/health/outline
```

List access keys:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/keys
```

Create access key:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"customer-demo-1"}' \
  http://127.0.0.1:8787/api/keys
```

Rename access key:

```bash
curl -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"customer-demo-renamed"}' \
  http://127.0.0.1:8787/api/keys/ACCESS_KEY_ID/name
```

Revoke access key:

```bash
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/keys/ACCESS_KEY_ID
```

## Client Records

Create a public beta request. This does not create an Outline key:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Customer","email":"demo@example.com","plan":"starter"}' \
  http://127.0.0.1:8787/api/requests
```

Create a pending client record from the admin API:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Customer","email":"demo@example.com","plan":"starter"}' \
  http://127.0.0.1:8787/api/clients
```

List clients:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients
```

Get a client, including their access URL:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID
```

Approve a pending client. This creates the Outline key and emails it if email is
configured:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/approve
```

Revoke a client and their Outline key:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/revoke
```

Rotate a client's key:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/rotate-key
```

Suspend a client:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/suspend
```

`/cancel` is kept as a compatibility alias for `/suspend`.

## Security Notes

- Do not deploy this backend without HTTPS in production.
- Keep `ADMIN_TOKEN` long and random.
- Put this behind an admin-only network or auth layer for early testing.
- Do not commit `.env`.
- Do not commit `backend/data/`; it contains the local customer database.
- Do not log access URLs in production.
- For payment automation, create keys only after verified payment webhooks.

## ORBIT Sentinel MVP

Sentinel is the private device visibility layer. It tracks trusted devices and
security events without exposing a public admin panel.

Create a device enrollment token:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Fabi Laptop","owner":"fabi","platform":"windows"}' \
  http://127.0.0.1:8787/api/sentinel/devices
```

The response includes `device.id` and `deviceToken`. Store the token privately;
it is not shown again.

Mark the device trusted:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/sentinel/devices/DEVICE_ID/trust
```

Send a test event from the device:

```bash
curl -X POST \
  -H "X-Sentinel-Device-Id: DEVICE_ID" \
  -H "X-Sentinel-Device-Token: DEVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"severity":"informational","eventType":"agent.started","summary":"Sentinel agent started","details":{"version":"0.1.0"}}' \
  http://127.0.0.1:8787/api/sentinel/events
```

List events:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/sentinel/events
```

Block a device:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/sentinel/devices/DEVICE_ID/block
```

Full architecture notes live in `docs/orbit-sentinel-architecture.md`.
