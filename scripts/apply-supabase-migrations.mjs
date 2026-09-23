#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (hasFlag('--local-reset')) {
  console.log('Applying migrations locally with a full Supabase DB reset...')
  run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['supabase', 'db', 'reset'])
  run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['supabase', 'db', 'lint'])
  console.log('Local migration application completed.')
  process.exit(0)
}

if (hasFlag('--linked-remote')) {
  if (!hasFlag('--confirm-remote')) {
    console.error('Refusing remote migration without --confirm-remote.')
    console.error('Recommended flow: backup remote database, verify staging, then run this command.')
    process.exit(1)
  }

  console.log('Applying migrations to the currently linked Supabase project...')
  run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['supabase', 'db', 'push'])
  console.log('Remote migration push completed.')
  process.exit(0)
}

console.log('Usage:')
console.log('  npm run supabase:apply -- --local-reset')
console.log('  npm run supabase:apply -- --linked-remote --confirm-remote')
console.log('')
console.log('Remote mode uses the currently linked Supabase project. Confirm target project before running.')
