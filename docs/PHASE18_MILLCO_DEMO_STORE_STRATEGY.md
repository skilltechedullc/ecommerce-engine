# Phase 18 Millco Demo Store Strategy

Status: Millco is positioned as Demo Store 001 for visually validating the ecommerce engine.

## Strategy

- Treat `shop.millco.in` as the first real-world demo store for the engine.
- Keep Millco useful as a visual reference while the reusable engine improves.
- Use Millco to verify homepage, product listing, product detail, cart, checkout, admin products, admin orders, order status, notifications, and mobile UI after major changes.
- Keep demo data clean enough to show future clients.
- Use Millco as a sales reference when explaining that this engine can launch client-owned stores.

## Demo Safety

- Do not expose real secrets, production credentials, private customer data, or sensitive order details during demos.
- Prefer preview/staging admin data for sales walkthroughs.
- Keep any "powered by ecommerce engine" reference internal unless intentionally added to a storefront package.
- Confirm the hosting branch/deployment that powers `shop.millco.in` before production rollout.

## Visual QA Checklist

Use [Millco Visual QA Checklist](MILLCO_VISUAL_QA_CHECKLIST.md) after major storefront/admin changes.
