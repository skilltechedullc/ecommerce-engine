import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('disposable local seed store exists and is not loaded by default reset seed', () => {
  const defaultSeed = readFileSync('supabase/seed.sql', 'utf8')
  const demoSeed = readFileSync('supabase/seed.client-demo.sql', 'utf8')

  assert.match(defaultSeed, /Keep empty/)
  assert.match(demoSeed, /Demo Coconut Oil/)
  assert.match(demoSeed, /Demo Honey/)
  assert.match(demoSeed, /Demo Rice Pack/)
  assert.match(demoSeed, /on conflict \(slug\)/)
})

test('phase 7 validation checklist documents local and staging gates', () => {
  const report = readFileSync('docs/PHASE7_LOCAL_STAGING_VALIDATION.md', 'utf8')

  assert.match(report, /Local Fresh Setup Checklist/)
  assert.match(report, /Staging Checklist/)
  assert.match(report, /Razorpay test credentials only/)
  assert.match(report, /Docker approval/)
})

test('phase 8 production rollout checklist documents backup, rollback, smoke tests, and monitoring', () => {
  const report = readFileSync('docs/PHASE8_PRODUCTION_ROLLOUT.md', 'utf8')

  assert.match(report, /Production Supabase Backup/)
  assert.match(report, /Rollback Plan/)
  assert.match(report, /Production Smoke Test/)
  assert.match(report, /Monitoring Window/)
  assert.match(report, /Move to production only when/)
})

test('phase 9 client-owned deployment foundation includes env generator and deployment docs', () => {
  const script = readFileSync('scripts/create-client-env-template.mjs', 'utf8')
  const setupScript = readFileSync('scripts/create-client-setup.mjs', 'utf8')
  const readinessScript = readFileSync('scripts/check-production-readiness.mjs', 'utf8')
  const migrationPlan = readFileSync('scripts/plan-supabase-migration.mjs', 'utf8')
  const migrationApply = readFileSync('scripts/apply-supabase-migrations.mjs', 'utf8')
  const storageVerify = readFileSync('scripts/verify-storage-setup.mjs', 'utf8')
  const report = readFileSync('docs/PHASE9_CLIENT_OWNED_DEPLOYMENT.md', 'utf8')
  const dns = readFileSync('docs/DOMAIN_DNS_CHECKLIST.md', 'utf8')
  const offboarding = readFileSync('docs/CLIENT_OFFBOARDING_EXPORT.md', 'utf8')
  const packageJson = readFileSync('package.json', 'utf8')

  assert.match(script, /NEXT_PUBLIC_STORE_PRESET=generic/)
  assert.match(script, /SUPABASE_SERVICE_ROLE_KEY=/)
  assert.match(script, /NEXT_PUBLIC_FEATURE_SHIPPING_INTEGRATIONS=false/)
  assert.match(setupScript, /handover-notes\.md/)
  assert.match(readinessScript, /checkReadiness/)
  assert.match(migrationPlan, /Supabase migration plan/)
  assert.match(migrationApply, /--local-reset/)
  assert.match(migrationApply, /--confirm-remote/)
  assert.match(storageVerify, /product-images/)
  assert.match(packageJson, /"client:env"/)
  assert.match(packageJson, /"client:setup"/)
  assert.match(packageJson, /"readiness"/)
  assert.match(packageJson, /"supabase:plan"/)
  assert.match(packageJson, /"supabase:apply"/)
  assert.match(packageJson, /"storage:verify"/)
  assert.match(report, /Client-Owned Model/)
  assert.match(report, /supabase:apply/)
  assert.match(report, /storage:verify/)
  assert.match(report, /Vercel/)
  assert.match(report, /Railway/)
  assert.match(report, /Backup And Exit Plan/)
  assert.match(dns, /Domain And DNS Checklist/)
  assert.match(offboarding, /Client Offboarding And Export Checklist/)
})

test('phase 10 base client package and handover guide are documented', () => {
  const packageDoc = readFileSync('docs/PHASE10_BASE_CLIENT_STORE_PACKAGE.md', 'utf8')
  const handover = readFileSync('docs/CLIENT_HANDOVER_GUIDE.md', 'utf8')
  const handoverScript = readFileSync('scripts/generate-client-handover.mjs', 'utf8')
  const packageJson = readFileSync('package.json', 'utf8')

  assert.match(packageDoc, /Included In Base Package/)
  assert.match(packageDoc, /Razorpay checkout/)
  assert.match(packageDoc, /Custom admin backend/)
  assert.match(packageDoc, /COD\/manual payment/)
  assert.match(handover, /Products/)
  assert.match(handover, /Orders/)
  assert.match(handover, /Settings/)
  assert.match(handover, /client:handover/)
  assert.match(handoverScript, /Admin URL/)
  assert.match(packageJson, /client:handover/)
})

test('client setup remains a local tool after removal of the web wizard', () => {
  const chrome = readFileSync('components/admin/AdminChrome.tsx', 'utf8')
  assert.doesNotMatch(chrome, /href: '\/admin\/launch'/)
  assert.match(readFileSync('scripts/create-client-setup.mjs', 'utf8'), /handover-notes/)
})
