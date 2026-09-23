#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const storeName = process.argv[2]
if (!storeName) {
  console.error('Usage: npm.cmd run client:setup -- "Client Store Name"')
  process.exit(1)
}

const slug = storeName
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'client-store'

const outputDir = join(process.cwd(), 'clients', slug)
mkdirSync(outputDir, { recursive: true })

const envResult = spawnSync(process.execPath, [join(process.cwd(), 'scripts', 'create-client-env-template.mjs'), storeName], {
  encoding: 'utf8',
})

if (envResult.status !== 0) {
  console.error(envResult.stderr || 'Failed to generate env template')
  process.exit(envResult.status ?? 1)
}

writeFileSync(join(outputDir, '.env.template'), envResult.stdout)
writeFileSync(join(outputDir, 'handover-notes.md'), `# ${storeName} Handover Notes

## Admin

- Admin URL:
- Admin email:
- Temporary password:
- Password changed by client:

## Client-Owned Accounts

- Supabase:
- Hosting:
- Domain/DNS:
- Razorpay/payment:
- Resend/email:
- WhatsApp provider:
- Shipping provider:

## Launch Checks

- Homepage checked:
- Product listing checked:
- Product detail checked:
- Cart checked:
- Checkout checked:
- Admin products checked:
- Admin orders checked:
- Notification test checked:
`)

console.log(`Created client setup folder: clients/${slug}`)
