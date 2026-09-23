#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { checkReadiness, readEnvironment } from './lib/readiness.mjs'

const envPath = process.argv[2] || '.env.local'
const mode = process.argv[3] || 'test'
try {
  const { errors, warnings } = checkReadiness(readEnvironment(readFileSync(envPath, 'utf8')), mode)
  for (const message of errors) console.error('- ' + message)
  for (const message of warnings) console.warn('Note: ' + message)
  if (errors.length) {
    console.error('Deployment configuration is incomplete. No credentials were printed.')
    process.exitCode = 1
  } else {
    console.log('Deployment configuration passed (' + mode + ' payments).')
  }
} catch {
  console.error('Could not read or parse the environment file. Usage: npm run readiness -- .env.fresh test')
  process.exitCode = 1
}
