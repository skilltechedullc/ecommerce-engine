# Phase 14 Orders, Shipping, And Notifications

Status: customer tracking and several shipping/notification foundations are implemented.

## Implemented

- Customer order tracking page at `/orders/track`.
- Customer receipt/print page at `/orders/receipt`.
- Customer-safe lookup using order ID and phone number.
- Shipment status/tracking display for customers when shipment data exists.
- Manual shipping provider.
- Manual flat-rate and free-shipping-threshold quote rules recorded on checkout sessions and orders.
- Shipping provider adapter pattern.
- Admin shipment creation.
- Failed notification retry dashboard/action.

## Still Open

- Payment-provider refund API integration.
- Real Shiprocket/Delhivery API implementations.
- Admin/provider health checks for credentials and delivery status.
- Shipping rate rules.
- Editable notification templates.
- Provider health checks.
