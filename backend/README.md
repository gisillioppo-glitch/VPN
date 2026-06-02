# ORBIT Outline Backend MVP

Small protected API for creating, listing, renaming, and revoking Outline access
keys.

This backend must run on a trusted server. Do not expose Outline Manager secrets
to the frontend.

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```text
ADMIN_TOKEN=long-random-admin-token
OUTLINE_API_URL=https://[::1]:8443/YOUR_SECRET_API_PREFIX
OUTLINE_CERT_SHA256=...
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

## Security Notes

- Do not deploy this backend without HTTPS in production.
- Keep `ADMIN_TOKEN` long and random.
- Put this behind an admin-only network or auth layer for early testing.
- Do not commit `.env`.
- Do not log access URLs in production.
- For payment automation, create keys only after verified payment webhooks.
