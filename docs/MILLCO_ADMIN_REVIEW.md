# Millco admin review — 2026-10-02

Reviewed dashboard, orders and order detail, product list/create/edit, categories, inventory, media, settings, notifications and staff access. Existing products and orders were not changed during this review.

## Changes

- Keep Dashboard, Orders, Products, Categories, Inventory, Media and Settings. Remove the pseudo-search and redundant profile block; add View store, current-page markers, visible mobile navigation and a test-payment notice.
- Hide staff-account navigation in single-password mode; direct staff-page access explains the current mode rather than offering unusable invitations.
- Show active store, contact, payment, shipping and support settings in plain language. Remove database draft/publish controls and inactive paid-module marketing from the merchant UI. Existing stored drafts and API history remain intact.
- Show actual notification configuration instead of a draft editor whose contents are not used for outgoing messages. Delivery results and retries stay on the order page.
- Add order search by customer/email/order/payment identifier, status and day filters, clear filters and no-match feedback. Today is explicitly UTC; CSV exports are explicitly all orders.
- Relabel aggregate totals as order value: the current aggregation includes unpaid/cancelled records, so it must not claim settled revenue.
- Connect managed categories and subcategories to create/edit product suggestions even before products use them.
- Accept safe local image paths so changing a sample product does not require removing built-in illustrations. Reject executable and protocol-relative image sources.
- Add media copy/open links and a useful empty state. Uploading does not itself publish an image to a product.
- Add inventory links back to the product for stock editing and an empty-history state.
- Replace manual placeholder shipment creation in the order UI with real tracking-reference/link/status entry. It does not book delivery, change order status or send messages. Permission, origin, rate and URL checks protect the endpoint; repeated creation uses a stable per-order ID. Integrated courier shipments are not overwritten. Only authorized roles see mutation controls. Order detail tables scroll within their container on mobile.

## Verification

All main pages and product/order details opened successfully in the local preview against Millco data (read only). Mobile product navigation was visually reviewed; no page-level horizontal overflow. Regression tests cover category suggestions and local-image handling. The isolated local tracking integration checks guest denial, cross-origin denial, unsafe URL rejection, repeated-save behavior and absence of unwanted order/status/notification changes. Its synthetic order is deleted after the test.

Future scope: full staff invitation/password-reset/2FA workflows, merchant-published brand settings and courier-provider onboarding are not represented as finished features. Meta activation still requires account setup. No customer records or catalog content were removed by this cleanup.