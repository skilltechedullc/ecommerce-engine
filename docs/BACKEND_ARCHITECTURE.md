# Backend Architecture (Production Baseline)

Last updated: 2026-03-27

## 1) API model

- Runtime: Next.js App Router Route Handlers
- Entry point directory: app/api
- Pattern: Single-tenant commerce backend (BFF style)

## 2) Standardized backend core

Shared server modules:

- lib/server/api.ts
  - HttpError class for typed API failures
  - withApiHandler() for centralized try/catch and request IDs
  - jsonOk()/jsonError() for consistent response envelope
  - parseJson() and field validators
- lib/server/env.ts
  - Lazy env resolution via env() and optionalEnv()
  - Prevents unrelated route crashes due to eager env loading
- lib/server/adminSession.ts
  - Signed admin session token generation/validation
  - Secure cookie helpers

## 3) Authentication model

- Endpoint: POST /api/admin-login
- Session: httpOnly cookie (admin-auth) with HMAC-signed token
- Validation: server-side signature + expiry checks
- Backward compatibility: legacy plaintext cookie accepted temporarily

## 4) Data access model

- Supabase anon client: lib/supabase.ts
- Supabase admin client singleton: lib/supabaseAdmin.ts
- Admin routes use service role client only on server

## 5) Response contract

All standardized routes return:

- success: boolean
- requestId: string
- data fields (when success=true)
- error/code/details (when success=false)

Compatibility preserved:

- Existing frontend fields like order_id, amount, products, error still returned.

## 6) Security hardening included

- Timing-safe comparison for payment/webhook signatures
- Timing-safe admin session signature verification
- Structured input validation in product/order/admin routes
- Request IDs in responses for traceability

## 7) Routes standardized

- /api/admin-login (POST, DELETE)
- /api/create-order
- /api/save-order
- /api/razorpay/webhook
- /api/admin/update-order-status
- /api/products/create
- /api/products/update
- /api/products/delete
- /api/products/list
- /api/health

## 8) Recommended next production steps

1. Add per-route rate limiting (Redis or edge KV based).
2. Add structured logger integration (requestId + route + latency).
3. Add idempotency key support for save-order.
4. Add integration tests for payment and webhook ordering race conditions.
5. Introduce RBAC if admin users become multi-user.
