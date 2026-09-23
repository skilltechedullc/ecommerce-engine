# Phase 9 Client-Owned Deployment Foundation

Status: client-owned deployment planning and env template generation are started.

## Client-Owned Model

Each client should own or control:

- Hosting account or project.
- Supabase project.
- Razorpay/payment account.
- Resend/email account.
- Domain and DNS.
- WhatsApp provider credentials if purchased.
- Shipping provider credentials if purchased.

## Env Template Generator

Generate a starting env template:

```powershell
npm.cmd run client:env -- "Fresh Grocery UAE"
```

This prints a client-specific `.env` skeleton with store identity, legal fields, Supabase, payment, email, feature flags, and shipping placeholders.

## Client Setup Folder

Create a client setup folder:

```powershell
npm.cmd run client:setup -- "Fresh Grocery UAE"
```

This creates:

- `clients/fresh-grocery-uae/.env.template`
- `clients/fresh-grocery-uae/handover-notes.md`

## Migration Planning

Print the migration plan before touching staging or production:

```powershell
npm.cmd run supabase:plan
```

Apply migrations locally:

```powershell
npm.cmd run supabase:apply -- --local-reset
```

Apply migrations to a linked staging/production project only after backup and review:

```powershell
npm.cmd run supabase:apply -- --linked-remote --confirm-remote
```

Verify the storage bucket using a filled environment:

```powershell
npm.cmd run storage:verify
npm.cmd run storage:verify -- --env clients/fresh-grocery-uae/.env.local --bucket product-images
```

## Readiness Check

Check a filled env file before launch:

```powershell
npm.cmd run readiness -- clients/fresh-grocery-uae/.env.template
```

## New Client Setup Flow

1. Create client project folder or branch.
2. Generate env template.
3. Fill client-owned Supabase credentials.
4. Fill admin credentials.
5. Fill Razorpay test credentials.
6. Keep optional modules disabled unless purchased.
7. Apply local/staging migrations.
8. Add sample products or import catalog.
9. Run verification.
10. Hand over admin URL and operating guide.

## Deployment Targets

- Vercel: preferred for Next.js storefront/admin.
- Railway: useful if the client wants a single managed app service.
- VPS/server: possible for clients who need server ownership, but requires maintenance SOP.

## Backup And Exit Plan

Each client should have:

- Product export.
- Order export.
- Customer/order-contact export.
- Settings export.
- Supabase backup schedule.
- Offboarding/export checklist.

See `docs/DOMAIN_DNS_CHECKLIST.md` and `docs/CLIENT_OFFBOARDING_EXPORT.md`.
