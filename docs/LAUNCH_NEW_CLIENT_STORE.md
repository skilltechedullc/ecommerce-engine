# Launch A New Client Store

Use this flow for client-owned deployments where the client controls their own Supabase, payment, email, hosting, domain, and provider accounts.

## Local First

1. Run the project locally with safe `.env.local` values.
2. Create the client folder with `npm run client:setup -- --client <client-slug>`.
3. Generate the client env skeleton with `npm run client:env -- --client <client-slug>`.
4. Validate readiness with `npm run readiness -- --env <client-env-file>`.
5. Validate catalog import files with `npm run catalog:validate-import -- --file <csv-file>`.

## Client Accounts

Collect only the credentials needed for launch:

- Supabase project URL, anon key, service role key.
- Razorpay or region-appropriate payment credentials and webhook secret.
- Resend API key, sender email, and admin notification email.
- Domain/DNS access.
- Optional WhatsApp, AI, shipping, analytics, reviews, loyalty, language, and currency add-on credentials.

## Launch Checks

- Homepage, product list, product detail, cart, checkout, success page.
- Admin login, product create/edit, order view, status update, shipment creation.
- Email notification delivery.
- Payment test mode before live mode.
- RLS and public anon key checks.
- Backup/export plan and client handover guide.
