#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function loadEnvFile(filePath) {
  if (!filePath || !existsSync(filePath)) return

  const contents = readFileSync(filePath, 'utf8')
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

    const [rawKey, ...rawValueParts] = trimmed.split('=')
    const key = rawKey.trim()
    const value = rawValueParts.join('=').trim().replace(/^['"]|['"]$/g, '')
    if (key && !process.env[key]) process.env[key] = value
  }
}

function required(name) {
  const value = process.env[name]
  if (!value || !value.trim()) {
    console.error(`Missing required environment variable: ${name}`)
    process.exit(1)
  }
  return value.trim()
}

const envPath = readArg('--env') ?? '.env.local'
loadEnvFile(envPath)

const bucketName = readArg('--bucket') ?? 'product-images'
const supabase = createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})

const { data: buckets, error } = await supabase.storage.listBuckets()
if (error) {
  console.error(`Failed to list storage buckets: ${error.message}`)
  process.exit(1)
}

const bucket = buckets.find((item) => item.name === bucketName)
if (!bucket) {
  console.error(`Missing storage bucket: ${bucketName}`)
  process.exit(1)
}

if (!bucket.public) {
  console.error(`Storage bucket ${bucketName} exists but is not public.`)
  process.exit(1)
}

console.log(`Storage bucket verified: ${bucketName}`)
