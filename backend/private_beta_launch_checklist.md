# ORBIT Private Beta Launch Checklist

Use this for the first 5-20 customers. Keep the process boring and controlled.

## Before Accepting A Customer

- Confirm the customer understands this is a private beta.
- Confirm payment manually.
- Confirm the customer has Outline Client installed or can install it.
- Confirm they will use ORBIT only for legal and authorized privacy use.

## Approve Customer

```bash
cd /opt/outline-kit/backend
set -a
. ./.env
set +a

curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/approve | jq
```

Send the `outlineAccessUrl` privately to the customer. Do not paste access keys
in public chats, screenshots, repos, or web pages.

## Suspend Customer

Use this for non-payment, cancellation, exposed keys, or support pauses.

```bash
curl -s -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://127.0.0.1:8787/api/clients/CLIENT_ID/suspend | jq
```

## Daily Checks

```bash
cd /opt/outline-kit
sudo bash verify.sh

sudo systemctl status orbit-backend --no-pager
sudo fail2ban-client status sshd
```

## Backup Check

Before onboarding many customers, run or verify backups for:

- `/opt/outline-kit/backend/data/orbit.db`
- Outline persisted state
- `/opt/outline-kit/.env`
- `/opt/outline-kit/backend/.env`

Never publish backups. They contain customer records and secrets.

## Launch Rule

If anything feels unclear, pause approvals. Fix the process before adding more
customers.
