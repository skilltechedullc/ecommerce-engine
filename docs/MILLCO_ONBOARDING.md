# Millco onboarding

Status: preparation only; not deployed or connected to the final domain.

## Confirmed

- Store: Millco
- Domain: shop.millco.in
- Country/currency: India / INR
- Managed by the agency; billing and suspension remain manual
- Start with a fresh catalog/database; no old customer orders will be imported by default
- WhatsApp number later; WhatsApp and AI remain disabled
- Baseline: demo-v0.1.0
- Store production branch: codex/millco-production
- Demo branch remains codex/fresh-deployment

## Prepared

Private settings are in the ignored .env.millco file. Brand name, domain, INR, Indian phone defaults and the existing millco-logo.svg asset are selected. Admin/session/webhook secrets were generated separately from the demo. Provider credentials and unconfirmed contact details are blank. Generic defaults avoid inheriting old unverified address, certification and delivery claims. Review the existing logo/tagline before launch.

Do not deploy using the current local .vercel link: it belongs to the demo. Create/select a separate Millco Vercel project explicitly once settings are complete. Keep the old Millco site/domain routing unchanged until staging passes.

## Next steps

1. Collect a new Millco Supabase Project URL, publishable key, server key and database connection; apply all migrations and prepare image storage. Do not load the demo seed.
2. Collect separate Upstash settings and the intended Razorpay merchant settings. Test mode first for verification; live settings only for the final merchant launch.
3. Configure Resend with a verified sender domain. Confirm public support email/phone, legal business name/address, delivery areas and charges, and policies.
4. Create an isolated Vercel project and connect this branch; import only Millco settings. Use the temporary deployment URL while testing.
5. Add real products, variants, prices, stock and images through admin; do not invent saleable catalog details.
6. Verify admin access, checkout, payment webhook recovery, customer tracking and customer/admin email delivery.
7. Connect shop.millco.in after reviewing the current domain assignment and completing launch checks. Set the canonical URL and final webhook URLs, then rebuild and verify again.

Secrets stay outside Git. Existing branches and the demo are retained. An empty catalog is a preparation state, not a ready-to-sell store.
