# Phase 12 Client-Owned Launch Wizard

Status: launch wizard skeleton is available in admin and mirrors the local setup scripts.

## Implemented

- Admin `/admin/launch` page.
- Client-owned setup step list.
- Links to settings review.
- Local automation commands shown in admin:
  - `npm.cmd run client:setup`
  - `npm.cmd run supabase:plan`
  - `npm.cmd run readiness`

## Still Open

- Turn checklist steps into interactive saved wizard state.
- Run Supabase migrations from the wizard.
- Verify storage buckets/policies from the wizard.
- Test Razorpay configuration from the wizard.
- Send Resend test email from the wizard.
- Generate final handover summary from wizard state.
