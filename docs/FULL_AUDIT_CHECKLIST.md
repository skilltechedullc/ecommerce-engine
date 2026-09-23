# Full Audit Checklist

Use this checklist before launching or after major engine changes.

## Payments

- Server-calculated amount is bound to payment order.
- Razorpay order/payment/currency/captured status are verified server-side.
- Replay and stale amount cases are rejected.
- Refund/cancellation behavior is documented.

## Database And RLS

- Public catalog data is readable only where intended.
- Orders, order items, customers, shipments, checkout sessions, notification logs, audit logs, and settings are not readable by anon.
- Migrations run cleanly on a fresh local database.

## Admin

- Admin mutation routes require authentication, permissions, and CSRF protection.
- Admin actions write audit logs where useful.
- Store owner workflows have empty states and safe error messages.

## Uploads

- Uploaded images are checked by file signature.
- Size limits are enforced.
- Dimension checks and optional re-encoding are added before high-scale launch.

## Webhooks And Notifications

- Meta/WhatsApp webhook signatures are verified.
- Payment webhooks are verified.
- Failed notifications can be retried.
- Provider health checks exist before selling managed integrations.

## Deployment

- Local lint, typecheck, tests, and build pass.
- Production secrets are not committed.
- Backup, rollback, smoke test, and monitoring plans are ready.
