# Shipping Setup

## Overview

This project now includes a shipping abstraction layer under [lib/shipping](lib/shipping).

The abstraction isolates courier provider logic from order and payment flows:

- [lib/shipping/types.ts](lib/shipping/types.ts): shared provider contracts and data models.
- [lib/shipping/index.ts](lib/shipping/index.ts): provider router driven by `SHIPPING_PROVIDER`.
- [lib/shipping/manual.ts](lib/shipping/manual.ts): zero-config provider for manual fulfillment.
- [lib/shipping/shiprocket.ts](lib/shipping/shiprocket.ts): typed stub for Shiprocket.
- [lib/shipping/delhivery.ts](lib/shipping/delhivery.ts): typed stub for Delhivery.
- [lib/shipping/service.ts](lib/shipping/service.ts): orchestration layer that creates shipments, persists DB rows, updates order status, and optionally sends customer channel updates.

## Default Manual Provider

`manual` is the default provider and requires no API keys.

Behavior:

1. Creates a local shipment reference (`MAN-...`).
2. Stores shipment in the `shipments` table with `pickup_scheduled` status.
3. Moves order status to `Processing`.
4. Uses existing notification flow via status updates.

This is safe for immediate usage in environments without courier credentials.

## Switching Providers

Provider switching is configuration-only:

- `SHIPPING_PROVIDER=manual`
- `SHIPPING_PROVIDER=shiprocket`
- `SHIPPING_PROVIDER=delhivery`

No application code changes are required.

## Shiprocket Setup (When Ready)

1. Create/enable a Shiprocket account.
2. Set environment variables:
   - `SHIPPING_PROVIDER=shiprocket`
   - `SHIPROCKET_EMAIL=...`
   - `SHIPROCKET_PASSWORD=...`
3. Implement API calls in [lib/shipping/shiprocket.ts](lib/shipping/shiprocket.ts) TODO sections.

Current behavior before implementation: provider returns a clear `not configured` result, so payment/order flow does not crash.

## Delhivery Setup (When Ready)

1. Create/enable Delhivery API access.
2. Set environment variables:
   - `SHIPPING_PROVIDER=delhivery`
   - `DELHIVERY_API_KEY=...`
   - `DELHIVERY_WAREHOUSE_NAME=...`
3. Implement API calls in [lib/shipping/delhivery.ts](lib/shipping/delhivery.ts) TODO sections.

Current behavior before implementation: provider returns a clear `not configured` result.

## Per-Client Configuration

Each tenant/environment can use a different courier provider by setting `SHIPPING_PROVIDER` and matching credentials in that deployment environment.

Example:

- Tenant A (India retail): `manual`
- Tenant B (larger volume): `shiprocket`
- Tenant C (enterprise contract): `delhivery`

## Auto-Create Shipment On Payment

Webhook integration is available in [app/api/razorpay/webhook/route.ts](app/api/razorpay/webhook/route.ts).

Enable by setting:

- `SHIPPING_AUTO_CREATE=true`

Default is `false`, so shipments are never auto-created unless explicitly enabled.

When enabled:

1. Razorpay marks order as `Paid`.
2. Shipping service attempts shipment creation in background.
3. Shipment failures are logged but do not break payment confirmation.

## Pickup Address Configuration

Set seller pickup values in environment:

- `SHIPPING_PICKUP_NAME`
- `SHIPPING_PICKUP_PHONE`
- `SHIPPING_PICKUP_ADDRESS_LINE1`
- `SHIPPING_PICKUP_ADDRESS_LINE2` (optional)
- `SHIPPING_PICKUP_CITY`
- `SHIPPING_PICKUP_STATE`
- `SHIPPING_PICKUP_PINCODE`
- `SHIPPING_PICKUP_COUNTRY`

These values are exposed through [lib/tenant.config.ts](lib/tenant.config.ts) as `tenantConfig.shipping.pickupAddress` and are used by shipment creation APIs.
