# Local Phase 0 Baseline

This file records the local-first baseline before engine hardening work.

Status: local Phase 0 setup and verification are complete. The only remaining Phase 0 item is confirming the live production deployment branch inside the hosting provider dashboard.

## Branch

- Working branch: `codex-phase-0-local-baseline`
- Started from: `feature/shipping-integration`
- Remote repository: `origin`

The exact production deployment branch for `shop.millco.in` cannot be proven from local files alone. Confirm it in the hosting provider dashboard before production rollout.

## Local Tooling

- Docker CLI is installed.
- Docker engine is reachable only with elevated permissions in this environment.
- No Docker containers were running during the Phase 0 check.
- Supabase CLI is installed locally as a dev dependency and usable with `npx supabase`.
- Supabase CLI version: `2.101.0`.
- In this Windows sandbox, `npx supabase` needs elevated local filesystem permission because the CLI writes telemetry under `C:\Users\hp\.supabase`.

Recommended local database strategy:

1. Use `npx supabase` from this repository.
2. Use Supabase local via Docker for migration and RLS testing.
3. Use a separate staging Supabase project only after local migrations pass.
4. Do not connect hardening work directly to production Supabase.

## Local Environment Safety

The current `.env.local` appears production-like because:

- The site URL is production-like.
- Supabase points to a remote Supabase project.
- Resend and AI keys are present.

Safer local hardening defaults are captured in `env.local.phase0.example`.

- Use a local or staging Supabase URL and keys.
- Use Razorpay test mode only.
- Keep WhatsApp automation disabled unless explicitly testing it.
- Use `SHIPPING_PROVIDER=manual`.
- Disable AI chat unless explicitly testing it.
- Avoid production email recipients while testing.

## Verification Baseline

- `npm.cmd run lint`: passed.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd run build`: passed with elevated filesystem permissions.
- `npm.cmd audit --audit-level=low`: failed due to known advisories, 12 vulnerabilities total.

Build notes:

- The Next.js workspace-root warning was resolved by setting `turbopack.root`.
- The `.next\trace` `EPERM` issue appears to be a sandbox/filesystem permission issue because the build passes when run with elevated filesystem permissions.
- During build, `/admin` logs a dynamic server usage warning while static generation probes the route. The build still exits successfully.

## Dependency Audit Baseline

Current audit summary:

- 12 vulnerabilities total.
- 4 high severity.
- 8 moderate severity.

Key packages involved:

- `next`
- `axios`
- `flatted`
- `picomatch`
- `@anthropic-ai/sdk`
- `postcss`
- `uuid`
- `ws`
- `follow-redirects`
- `brace-expansion`
