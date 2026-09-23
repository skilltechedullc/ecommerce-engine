# Phase 15 Admin Users And Roles

Status: permission mapping foundation is implemented; real multi-user login remains open.

## Implemented

- Defined admin roles: `owner`, `product_manager`, `order_manager`, `support`, and `developer`.
- Added explicit permission maps behind `hasPermission`.
- Kept the current single-password admin session mapped to `super_admin` so existing admin access does not break.
- Added database-backed admin users, roles, invited/active/disabled status, session storage, temporary password setup, and 2FA readiness fields.

## Recommended Role Usage

- Owner: full store operations and settings access.
- Product manager: catalog, images, variants, pricing, and stock.
- Order manager: orders, shipment creation, status updates, and exports.
- Support: read-only order lookup for customer support.
- Developer: read-only operational access for troubleshooting.

## Still Open

- Replace single password admin with real user records.
- Wire outbound invite/reset emails after the real client email provider is connected.
- Enforce 2FA challenges after a concrete OTP provider/app flow is selected.
- Add demo-safe admin mode for sales presentations.
