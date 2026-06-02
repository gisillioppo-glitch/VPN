# Northline VPN Portal MVP

Static MVP for a commercial Outline-based VPN portal.

Open `index.html` in a browser to view it locally.

## Current Scope

- Landing page
- Pricing cards
- Windows onboarding section
- Simulated client portal
- Simulated admin panel
- Simulated billing integration state

The current portal does not call the real Outline API and does not expose
secrets. It is a design and workflow MVP.

## Production Backend Plan

1. Keep the Outline Manager API config only on the backend.
2. Add customer auth.
3. Add payment provider webhooks.
4. Create an Outline access key only after verified payment.
5. Store key metadata per customer.
6. Revoke keys after cancellation, abuse, or manual admin action.
7. Never send server admin credentials to the frontend.

## Recommended Stack For The Next Phase

- Frontend: Next.js or static Astro site
- Backend: Node/Express or Next.js API routes
- Database: SQLite for MVP, Postgres for production
- Payments: Stripe or Lemon Squeezy
- Deployment: separate small VPS or managed app host

## Compliance Notes

Use clear terms of service, acceptable-use rules, and support processes. This
product should be sold for authorized privacy use, not for bypassing policies on
networks where VPN use is prohibited.
