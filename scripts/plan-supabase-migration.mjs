#!/usr/bin/env node

import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort()

console.log('Supabase migration plan')
console.log('')
for (const migration of migrations) {
  console.log(`- ${migration}`)
}
console.log('')
console.log('Safe rollout order:')
console.log('1. Run local: npx.cmd supabase db reset')
console.log('2. Run local lint: npx.cmd supabase db lint --local')
console.log('3. Run schema verification SQL')
console.log('4. Backup staging/production before applying remotely')
console.log('5. Apply with Supabase CLI only after local and staging checks pass')
