import assert from 'node:assert/strict'
import test from 'node:test'
import { checkReadiness, readEnvironment } from '../scripts/lib/readiness.mjs'

const valid = {
  NEXT_PUBLIC_SITE_URL: 'https://demo.myshop.net', NEXT_PUBLIC_BRAND_NAME: 'Demo Store',
  NEXT_PUBLIC_CONTACT_EMAIL: 'support@myshop.net',
  NEXT_PUBLIC_SUPABASE_URL: 'https://fresh.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'private-key', ADMIN_SESSION_SECRET: 'a'.repeat(40),
  ADMIN_PASSWORD: 'c'.repeat(20), UPSTASH_REDIS_REST_URL: 'https://fresh.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'redis-token', RAZORPAY_KEY_ID: 'rzp_test_123',
  NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_123', RAZORPAY_KEY_SECRET: 'secret',
  RAZORPAY_WEBHOOK_SECRET: 'webhook', RESEND_API_KEY: 're_demo',
  EMAIL_FROM_ADDRESS: 'orders@myshop.net',
}

test('complete test deployment settings pass without exposing credentials', () => {
  assert.deepEqual(checkReadiness(valid).errors, [])
})

test('missing rate limiter fails deployment readiness', () => {
  assert.ok(checkReadiness({ ...valid, UPSTASH_REDIS_REST_TOKEN: '' }).errors.some((e: string) => e.includes('UPSTASH')))
})

test('mismatched payment keys and modes cannot pass readiness', () => {
  assert.ok(checkReadiness({ ...valid, NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_live_other' }).errors.length)
  assert.ok(checkReadiness(valid, 'live').errors.length)
})

test('quoted empty env values are missing, not configured', () => {
  const env = readEnvironment('ADMIN_SESSION_SECRET=""\nUPSTASH_REDIS_REST_TOKEN=""\n')
  assert.ok(checkReadiness({ ...valid, ...env }).errors.length)
})

test('local infrastructure and weak secrets cannot pass hosted readiness', () => {
  const result = checkReadiness({ ...valid, NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321', ADMIN_SESSION_SECRET: 'short' })
  assert.ok(result.errors.some((e: string) => e.includes('HTTPS')))
  assert.ok(result.errors.some((e: string) => e.includes('32 characters')))
})
