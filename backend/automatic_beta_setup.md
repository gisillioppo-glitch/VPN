# ORBIT Automatic Beta Setup

This is the practical path for a 5-20 customer private beta.

## Goal

Build this flow:

```text
Website form
-> public API over HTTPS
-> pending customer record
-> request received email
-> manual payment review
-> approve
-> Outline key generated
-> access key email sent privately
```

This does not require Stripe, Kubernetes, multi-region servers, or a complex
customer dashboard.

## What We Need

- A domain, for example `orbitvpn.co`.
- Cloudflare DNS for the domain.
- Cloudflare Tunnel from `api.orbitvpn.co` to `http://127.0.0.1:8787`.
- Resend account for transactional email.
- A sender address, for example `hello@orbitvpn.co`.

## Backend Environment

Edit `/opt/outline-kit/backend/.env`:

```text
PUBLIC_PORTAL_ORIGIN=https://gisillioppo-glitch.github.io
BRAND_NAME=ORBIT VPN
SUPPORT_EMAIL=hello@orbitvpn.co
RESEND_API_KEY=...
EMAIL_FROM=ORBIT VPN <hello@orbitvpn.co>
ADMIN_NOTIFY_EMAIL=your-admin-email@example.com
PUBLIC_REQUEST_WINDOW_MS=3600000
PUBLIC_REQUEST_MAX_PER_WINDOW=5
```

Restart:

```bash
sudo systemctl restart orbit-backend
curl http://127.0.0.1:8787/health
```

## Website Config

When the API tunnel is live, edit:

```text
vpn-portal/config.js
```

Set:

```js
window.ORBIT_CONFIG = {
  apiBaseUrl: "https://api.orbitvpn.co",
};
```

Commit and push. GitHub Pages will redeploy.

## Admin Operations

Use the helper:

```bash
cd /opt/outline-kit
bash backend/orbit-admin.sh pending
bash backend/orbit-admin.sh approve CLIENT_ID
bash backend/orbit-admin.sh suspend CLIENT_ID
bash backend/orbit-admin.sh keys
```

Approval generates the Outline key. If Resend is configured, the customer gets
the access key email automatically.

## End-To-End Test

1. Submit the website form.
2. Confirm the customer appears as `pending`.
3. Confirm the request-received email arrives.
4. Approve the customer.
5. Confirm the access-key email arrives.
6. Import the key in Outline Client.
7. Confirm public IP is the ORBIT gateway.
8. Suspend the test customer.
9. Confirm the test key disappears from `/api/keys`.

## Safety Rules

- Do not expose the Outline management API publicly.
- Do not put `ADMIN_TOKEN` in the browser.
- Do not paste `ss://` access URLs publicly.
- Do not approve customers before payment/manual review.
- Keep one key per customer.
