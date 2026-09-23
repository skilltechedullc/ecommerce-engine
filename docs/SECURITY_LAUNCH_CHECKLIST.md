# Security Launch Checklist

Use this before handing over any client-owned store.

## Database

- Run all migrations on local first.
- Run all migrations on staging before production.
- Confirm RLS is enabled on products, variants, images, orders, and order items.
- Confirm anon key can read only active catalog data.
- Confirm anon key cannot read orders, order items, checkout sessions, shipments, notification logs, or chat sessions.
- Confirm service role key is not exposed to the browser.

## Admin

- Confirm admin mutations reject cross-site origins.
- Confirm admin cookie is httpOnly, secure in production, and expires.
- Confirm admin password/session secrets are unique per client.
- Confirm admin mutation routes require permission checks.

## Payments

- Use Razorpay test mode before production mode.
- Confirm checkout_sessions rows are created.
- Confirm server-side payment verification checks amount, currency, order ID, payment ID, and captured status.
- Confirm duplicate payment IDs are idempotent.

## Webhooks And Integrations

- Confirm Razorpay webhook signature secret.
- Confirm WhatsApp/Meta `x-hub-signature-256` verification secret.
- Confirm Resend sender domain is verified.
- Confirm WhatsApp automation is disabled unless paid/enabled.

## Uploads

- Confirm upload size limit.
- Confirm MIME and file-signature validation.
- Confirm storage bucket is public-read only for product images.
- Confirm no anonymous upload policy exists.

## Runtime

- Confirm production rate limiter is configured.
- Confirm `npm audit --audit-level=low` returns `0 vulnerabilities`.
- Confirm `npm run verify` passes.
- Confirm production env vars do not use local/test placeholder secrets.
