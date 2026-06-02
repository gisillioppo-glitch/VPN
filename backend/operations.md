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

Create client and Outline key:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Customer","email":"demo@example.com","plan":"starter"}' \
  http://127.0.0.1:8787/api/clients
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

Cancel a client:

```bash
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/cancel
```

## Status Meaning

- `active`: client has a usable Outline key.
- `revoked`: key was revoked manually, usually for security/support.
- `cancelled`: account should not receive new keys unless reactivated manually.
