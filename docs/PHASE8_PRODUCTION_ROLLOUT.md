# Phase 8 Controlled Production Rollout

Status: production rollout checklist and rollback plan are ready. No production deployment or production Supabase change has been performed.

## Pre-Rollout Rules

- Do not apply production migrations until local and staging migrations pass.
- Backup production Supabase before any migration.
- Deploy to preview/staging before production.
- Smoke test the preview/staging build before production.
- Keep `shop.millco.in` as Demo Store 001 and use it for visual QA only after the controlled rollout gates pass.

## Production Supabase Backup

Before production migration:

1. Export schema.
2. Export data for products, variants, images, orders, order items, shipments, notification logs, audit logs, and settings.
3. Record current migration list.
4. Store backup location and timestamp in the rollout notes.
5. Confirm restore steps are known before applying migrations.

## Rollback Plan

- Code rollback: redeploy the previous known-good hosting deployment.
- Database rollback: restore the pre-migration backup if a migration corrupts or blocks core workflows.
- Feature rollback: disable optional env flags for WhatsApp, AI, advanced analytics, reviews, loyalty, multi-language, multi-currency, and shipping integrations.
- Payment rollback: keep Razorpay test/live credential changes separate from code deployment.
- Communication rollback: disable Resend/WhatsApp automation if notification failures spike.

## Production Smoke Test

After deploy:

- Homepage loads.
- Product listing loads.
- Product detail loads.
- Cart add/remove/update works.
- Checkout opens Razorpay correctly.
- Admin login works.
- Admin products list opens.
- Admin product edit opens.
- Admin orders list opens.
- Admin order detail opens.
- Admin settings opens.
- Notification retry screen opens.
- Shipping/manual status flow opens.

## Monitoring Window

For the first 24 hours after production rollout, monitor:

- Failed checkout sessions.
- Failed payment verifications.
- Failed order saves.
- Failed notification logs.
- Failed webhook logs.
- API 500s.
- Low stock/incorrect stock reports.
- Admin login/session issues.

## Rollout Decision

Move to production only when:

- Local verification passes.
- Staging verification passes.
- Manual payment test passes in Razorpay test mode.
- Admin order/product workflows pass in staging.
- Rollback plan and backup are ready.
