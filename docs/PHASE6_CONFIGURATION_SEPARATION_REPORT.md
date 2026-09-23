# Phase 6 Configuration Separation Report

Status: Phase 6 local code baseline is complete and verified. Local Supabase replay for the final `store_settings` migration is pending because Docker escalation was blocked by the app usage-limit gate.

## What Changed

- Added store presets in `lib/store/presets.ts`.
- Added a generic preset for new client/local stores.
- Kept Millco as an explicit demo preset instead of leaving Millco defaults scattered through app pages.
- Connected `tenantConfig` brand, contact, region, phone, legal, and currency defaults to the selected store preset.
- Added `tenantConfig.legal` for operator name, website label, support email, business description, and jurisdiction country.
- Updated Privacy Policy, Terms & Conditions, and Refund Policy pages to read legal/client values from config.
- Added `NEXT_PUBLIC_STORE_PRESET` and legal env fields to the local env template.
- Added `npm.cmd run test:config` to guard against Millco legal/contact strings reappearing in app pages.
- Added explicit paid-module feature flags for product reviews, advanced analytics, multi-language, multi-currency, and shipping integrations.
- Added social link fields to the store contact configuration model.
- Moved remaining long marketing defaults out of `tenant.config.ts` into store marketing defaults.
- Added an admin Settings screen that previews active identity, contact, business, legal, and paid-module configuration.
- Added `store_settings` migration for saved drafts and published snapshots.
- Added admin store settings API with same-origin protection, permission checks, draft/publish persistence, and audit logs.
- Added an admin JSON draft editor with Save Draft and Publish Snapshot actions.

## Verification

Passed:

- `npm.cmd run test:config`
- `npm.cmd run test:phase7`
- `npm.cmd run test:audit`
- `npm.cmd run test:security`
- `npm.cmd run test:phase3`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd audit --audit-level=low`

## Still Open In Phase 6

- Switch runtime config loading to published `store_settings` after staging validation.
- Replay `20260331000009_store_settings.sql` against local Supabase once Docker approval is available.

## Recommendation

Phase 6 is complete for the local code baseline. The remaining runtime switch should happen after local Supabase migration replay and staging validation, because it changes how every storefront page receives branding, legal, and feature config.
