# Local Verification Checklist

Use this checklist before and after each local change batch.

## Standard Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test:phase3
npm.cmd run test:security
npm.cmd run test:audit
npm.cmd run test:config
npm.cmd run test:phase7
npm.cmd run build
npm.cmd audit --audit-level=low
```

`npm.cmd run verify` runs lint, typecheck, Phase 3 checkout hardening checks, security helper checks, audit reliability checks, config-separation checks, Phase 7 validation checks, and build together.

## Notes For This Windows Workspace

- `npm.cmd run build` may need elevated local filesystem permission in this Codex sandbox because Next.js writes trace files under `.next`.
- `npx.cmd supabase --version` may need elevated local filesystem permission because the Supabase CLI writes telemetry under `C:\Users\hp\.supabase`.
- The current `.env.local` is remote-Supabase-backed. For deeper local hardening, copy `env.local.phase0.example` into `.env.local` only when intentionally switching to local/test services.
- Production migrations should not be applied during local verification.

## Current Expected Result

- Lint: pass.
- Typecheck: pass.
- Phase 3 checkout hardening checks: pass.
- Security helper checks: pass.
- Audit reliability checks: pass.
- Config separation checks: pass.
- Phase 7 validation checks: pass.
- Build: pass.
- Audit: pass with `0` vulnerabilities.

## Known Build Messages

- Next.js logs a custom `Cache-Control` header warning for `/_next/static/:path*`.
- Admin dashboard Supabase fetch warnings can appear during local builds when the sandbox cannot reach the configured Supabase URL.
- Both messages currently occur with a successful build exit code.
