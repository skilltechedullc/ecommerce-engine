#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function parseArgs(argv) {
  const args = { envFile: '.env.local' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--env') args.envFile = argv[index + 1] ?? args.envFile
    if (arg === '--client') args.client = argv[index + 1]
  }
  return args
}

function parseEnvFile(path) {
  const content = readFileSync(path, 'utf8')
  const env = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    env[trimmed.slice(0, separator)] = trimmed.slice(separator + 1)
  }

  return env
}

function value(env, key, fallback = 'Not configured') {
  const current = env[key]?.trim()
  return current || fallback
}

const args = parseArgs(process.argv.slice(2))
const envPath = resolve(args.envFile)
const env = parseEnvFile(envPath)
const siteUrl = value(env, 'NEXT_PUBLIC_SITE_URL', 'https://client-domain.example')
const adminUrl = `${siteUrl.replace(/\/$/, '')}/admin/login`
const storeName = value(env, 'NEXT_PUBLIC_BRAND_NAME', args.client ?? 'Client Store')

const summary = [
  `# ${storeName} Handover Summary`,
  '',
  `Store URL: ${siteUrl}`,
  `Admin URL: ${adminUrl}`,
  `Admin email: ${value(env, 'ADMIN_EMAIL')}`,
  `Temporary admin password: ${value(env, 'ADMIN_PASSWORD')}`,
  '',
  '## Client-Owned Accounts',
  '',
  `Supabase URL: ${value(env, 'NEXT_PUBLIC_SUPABASE_URL')}`,
  `Payment provider: ${value(env, 'RAZORPAY_KEY_ID', 'Not configured or not using Razorpay')}`,
  `Email sender: ${value(env, 'EMAIL_FROM_ADDRESS')}`,
  '',
  '## Training Checklist',
  '',
  '- Add/edit products and variants.',
  '- Update stock and product status.',
  '- Review orders and payment method.',
  '- Change order status.',
  '- Create manual shipments.',
  '- Retry failed notifications.',
  '- Export products/orders when needed.',
  '',
  '## Security Note',
  '',
  'Ask the client to change temporary admin credentials after handover. Keep Supabase, payment, email, and domain accounts owned by the client.',
].join('\n')

console.log(summary)
