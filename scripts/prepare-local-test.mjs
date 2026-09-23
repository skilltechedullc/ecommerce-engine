import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import crypto from 'node:crypto'

const status = parseEnv(execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
if (!status.API_URL?.startsWith('http://127.0.0.1:')) throw new Error('Expected local Supabase only')
const env = Object.fromEntries(Object.keys(parseEnv(readFileSync('.env.example', 'utf8'))).map(key => [key, '']))
Object.assign(env, {
  NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3001',
  NEXT_PUBLIC_BUSINESS_SITE_URL: 'http://127.0.0.1:3001',
  NEXT_PUBLIC_STORE_PRESET: 'generic',
  NEXT_PUBLIC_BRAND_NAME: 'Demo Store',
  NEXT_PUBLIC_BRAND_SHORT_NAME: 'Demo',
  NEXT_PUBLIC_LOGO_URL: '/logo.svg',
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY || status.PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY || status.SECRET_KEY,
  ADMIN_PASSWORD: crypto.randomBytes(24).toString('hex'),
  ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  ADMIN_AUTH_MODE: 'single_password',
  RAZORPAY_KEY_ID: 'rzp_test_local_only',
  NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_local_only',
  RAZORPAY_KEY_SECRET: 'local-only-not-valid-at-provider',
  RAZORPAY_WEBHOOK_SECRET: 'local-only-webhook-secret',
  NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS: 'true',
  WHATSAPP_ENABLED: 'false',
  NEXT_PUBLIC_FEATURE_AI_CHAT: 'false',
  NEXT_PUBLIC_FEATURE_WHATSAPP_BOT: 'false',
  SHIPPING_PROVIDER: 'manual',
})
delete env.NODE_ENV
for (const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY']) if (!env[key]) throw new Error('Local API keys unavailable')
writeFileSync('.env.local-test', Object.entries(env).map(([k,v]) => k + '=' + JSON.stringify(v)).join('\n') + '\n', { mode: 0o600 })
console.log('Prepared isolated local test settings. External payment and notification credentials are disabled.')
