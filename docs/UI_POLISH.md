# Millco UI polish — 3 October 2026

Branch: codex/millco-production.

## Customer experience
- Product photos fall back from the selected size to the product gallery when added to cart; re-adding updates an older missing image.
- Mini-cart delivery progress uses the configured threshold (Millco: INR 1,000); checkout button includes delivery.
- Compact cart, fewer repeated promotional/trust panels, consistent serif product headings, pack sizes beside catalog prices.
- One support launcher when AI is enabled, with an explicit WhatsApp link; mobile purchase bars have clearance. Standalone WhatsApp remains when AI is disabled.
- Separate street, city, state and PIN entry; existing server-facing address remains a joined string for orders, payments and OTP verification.
- Public bestseller ranking is suppressed while payment credentials are in test mode.

## Admin experience
- Dispatch and pending-review shortcuts, compact mobile order cards, clearer metric labels.
- Order dates and day/month groupings use IST for India stores (UTC fallback for others).
- Order CSV exports share the listing filters, including awaiting dispatch.
- Paid online order value is separate from total order value; neither claims bank settlement totals.
- Product image library picker, clearer compare-at/MRP label, mobile-friendly fields and a persistent save bar.

## Verification
- 87 unit tests passed, including date-boundary and combined order-filter checks.
- Local browser exercised cart image, shipping progress, support clearance, complete address payload (payment request intercepted), mobile orders, tracking form, media-library empty state, filtered CSV and desktop layouts. No customer messages or payment orders created.
- Production build and post-deployment checks are recorded in the release conversation.

## Still owner-dependent
Real product photography, verified ingredients/shelf-life/origin/certification details, final catalog prices and live payment credentials. WhatsApp automation and protected coupon activation still require Meta connection and real delivery testing. Sample descriptions are deliberately retained until confirmed.
