# Client Handover Guide

Use this when handing a completed store to a client.

## Login

1. Open the admin URL.
2. Sign in with the temporary admin details.
3. Change/store credentials according to the support agreement.

Generate a handover summary with:

```bash
npm run client:handover -- --env clients/<client-slug>/.env.production
```

## Products

1. Go to Products.
2. Add product name, category, description, and images.
3. Add at least one variant with price and stock.
4. Keep inactive products hidden from the storefront.
5. Use stock numbers carefully because checkout depends on them.

## Orders

1. Go to Orders.
2. Open an order.
3. Review customer details, items, payment ID, and total.
4. Move the order through the allowed status flow.
5. Add a reason when cancelling, refunding, or marking returns.

## Shipping

1. Open the order detail page.
2. Create shipment when the order is ready.
3. Use manual fulfillment unless a shipping integration is enabled.
4. Share tracking manually if provider automation is not enabled.

## Notifications

1. Check notification logs on the order detail page.
2. Use retry failed notifications when email or WhatsApp delivery fails.
3. Contact support if provider credentials are invalid.

## Settings

1. Open Settings.
2. Review identity, contact, legal, business, and feature flags.
3. Draft changes before publishing.
4. Ask developer/support to validate runtime config changes until DB-backed runtime loading is enabled.
