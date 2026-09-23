import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('store presets isolate Millco defaults outside app pages', () => {
  const presetSource = readFileSync('lib/store/presets.ts', 'utf8')
  const tenantConfig = readFileSync('lib/tenant.config.ts', 'utf8')
  const privacy = readFileSync('app/privacy-policy/page.tsx', 'utf8')
  const terms = readFileSync('app/terms-and-conditions/page.tsx', 'utf8')
  const refund = readFileSync('app/refund-policy/page.tsx', 'utf8')

  assert.match(presetSource, /STORE_PRESETS/)
  assert.match(presetSource, /generic/)
  assert.match(presetSource, /millco/)
  assert.match(tenantConfig, /getStorePreset/)
  assert.match(tenantConfig, /legal:/)

  for (const source of [privacy, terms, refund]) {
    assert.match(source, /tenantConfig\.legal/)
    assert.doesNotMatch(source, /shop\.millco\.in/)
    assert.doesNotMatch(source, /info@millco\.in/)
    assert.doesNotMatch(source, /Millco Organic/)
  }
})

test('paid module feature flags are represented in tenant config', () => {
  const tenantConfig = readFileSync('lib/tenant.config.ts', 'utf8')
  const envTemplate = readFileSync('env.local.phase0.example', 'utf8')

  for (const feature of [
    'PRODUCT_REVIEWS',
    'ADVANCED_ANALYTICS',
    'MULTI_LANGUAGE',
    'MULTI_CURRENCY',
    'SHIPPING_INTEGRATIONS',
    'MANUAL_PAYMENTS',
  ]) {
    assert.match(envTemplate, new RegExp(`NEXT_PUBLIC_FEATURE_${feature}=false`))
  }

  for (const field of [
    'productReviews',
    'advancedAnalytics',
    'multiLanguage',
    'multiCurrency',
    'shippingIntegrations',
    'manualPayments',
  ]) {
    assert.match(tenantConfig, new RegExp(`${field}: boolean`))
    assert.match(tenantConfig, new RegExp(`${field}: envBoolean`))
  }
})

test('store configuration supports client social links', () => {
  const presetSource = readFileSync('lib/store/presets.ts', 'utf8')
  const tenantConfig = readFileSync('lib/tenant.config.ts', 'utf8')
  const envTemplate = readFileSync('env.local.phase0.example', 'utf8')

  for (const key of ['instagram', 'facebook', 'youtube', 'x', 'linkedin']) {
    assert.match(presetSource, new RegExp(`${key}: string`))
    assert.match(tenantConfig, new RegExp(`${key}: env\\('NEXT_PUBLIC_SOCIAL_`))
  }

  for (const envName of [
    'NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL',
    'NEXT_PUBLIC_SOCIAL_FACEBOOK_URL',
    'NEXT_PUBLIC_SOCIAL_YOUTUBE_URL',
    'NEXT_PUBLIC_SOCIAL_X_URL',
    'NEXT_PUBLIC_SOCIAL_LINKEDIN_URL',
  ]) {
    assert.match(envTemplate, new RegExp(envName))
  }
})

test('marketing defaults live outside tenant config', () => {
  const tenantConfig = readFileSync('lib/tenant.config.ts', 'utf8')
  const marketingDefaults = readFileSync('lib/store/marketingDefaults.ts', 'utf8')

  assert.match(marketingDefaults, /genericMarketingDefaults/)
  assert.match(marketingDefaults, /millcoMarketingDefaults/)
  assert.match(tenantConfig, /marketingDefaults\.home\.heroTitle/)
  assert.match(tenantConfig, /marketingDefaults\.checkout\.heroTitle/)
  assert.match(tenantConfig, /marketingDefaults\.whatsapp\.checkoutIntroMessage/)
  assert.doesNotMatch(tenantConfig, /Zero Sulphur/)
  assert.doesNotMatch(tenantConfig, /Sulphur-Free Coconut Oil/)
  assert.doesNotMatch(tenantConfig, /FSSAI Certified Quality/)
})

test('admin settings preview exposes active configuration safely', () => {
  const chrome = readFileSync('components/admin/AdminChrome.tsx', 'utf8')
  const settingsPage = readFileSync('app/admin/(protected)/settings/page.tsx', 'utf8')
  const editor = readFileSync('app/admin/(protected)/settings/SettingsDraftEditor.tsx', 'utf8')

  assert.match(chrome, /href: '\/admin\/settings'/)
  assert.match(settingsPage, /Store settings/)
  assert.match(settingsPage, /Paid module flags/)
  assert.match(settingsPage, /store_settings/)
  assert.match(settingsPage, /tenantConfig\.legal/)
  assert.match(settingsPage, /tenantConfig\.features/)
  assert.match(settingsPage, /SettingsDraftEditor/)
  assert.match(editor, /Save Draft/)
  assert.match(editor, /Publish Snapshot/)
  assert.match(editor, /\/api\/admin\/store-settings/)
})

test('store settings persistence API is audit logged and service-only', () => {
  const migration = readFileSync('supabase/migrations/20260331000009_store_settings.sql', 'utf8')
  const route = readFileSync('app/api/admin/store-settings/route.ts', 'utf8')
  const verification = readFileSync('supabase/verify_phase2_schema.sql', 'utf8')

  assert.match(migration, /create table if not exists public\.store_settings/)
  assert.match(migration, /alter table public\.store_settings enable row level security/)
  assert.doesNotMatch(migration, /to anon/)
  assert.doesNotMatch(migration, /to authenticated/)
  assert.match(route, /store_settings\.draft_update/)
  assert.match(route, /store_settings\.publish/)
  assert.match(route, /writeAuditLog/)
  assert.match(verification, /store_settings table is missing/)
})

test('production build does not depend on remote Google font fetches', () => {
  const layout = readFileSync('app/layout.tsx', 'utf8')

  assert.doesNotMatch(layout, /next\/font\/google/)
  assert.match(layout, /--font-geist/)
  assert.match(layout, /--font-playfair/)
})

test('store theme presets are available and wired to tenant config', () => {
  const config = readFileSync('lib/tenant.config.ts', 'utf8')
  const presets = readFileSync('lib/store/themePresets.ts', 'utf8')
  const settings = readFileSync('app/admin/(protected)/settings/page.tsx', 'utf8')

  assert.match(presets, /natural/)
  assert.match(presets, /market/)
  assert.match(presets, /fastCommerce/)
  assert.match(presets, /boutique/)
  assert.match(presets, /NEXT_PUBLIC_THEME_PRESET/)
  assert.match(config, /themePreset/)
  assert.match(settings, /Theme preset/)
})
