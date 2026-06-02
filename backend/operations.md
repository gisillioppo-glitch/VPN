# ORBIT Backend Operations

## Current Production Shape

- Runs on the same VPS as Outline.
- Listens only on `127.0.0.1:8787`.
- Managed by `systemd` as `orbit-backend.service`.
- Uses SQLite at `backend/data/orbit.db`.
- Talks to Outline through `https://[::1]:8443/<api-prefix>`.

## Health Checks

```bash
curl http://127.0.0.1:8787/health
```

```bash
cd /opt/outline-kit/backend
set -a
. ./.env
set +a

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/health/outline
```

## Service Commands

```bash
sudo systemctl status orbit-backend --no-pager
sudo systemctl restart orbit-backend
sudo journalctl -u orbit-backend -n 100 --no-pager
```

## Dependency Notes

`sqlite3` is a native dependency. On Ubuntu 22.04, use:

```bash
sudo apt-get update
sudo NEEDRESTART_MODE=a DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential python3 make g++
cd /opt/outline-kit/backend
npm rebuild sqlite3 --build-from-source
```

This avoids using a prebuilt binary that expects a newer glibc than Ubuntu
22.04 provides.

## Audit

```bash
cd /opt/outline-kit/backend
npm audit --omit=dev
```

Expected current result:

```text
found 0 vulnerabilities
```

## Customer Flow

Public beta request. This creates a `pending` record and sends request-received
email if email is configured:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Customer","email":"demo@example.com","plan":"starter"}' \
  http://127.0.0.1:8787/api/requests
```

List pending clients:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients | jq '.clients[] | select(.status=="pending")'
```

Approve after payment review. This creates the Outline key and emails it if
email is configured:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/approve
```

Revoke client and Outline key:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/revoke
```

Rotate a lost or exposed key:

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

## Status Meaning

- `pending`: request received, no key generated yet.
- `approved`: payment/review passed, client has a usable Outline key.
- `suspended`: access paused; approving again creates a fresh key.
- `revoked`: account/key closed permanently for this beta cycle.
