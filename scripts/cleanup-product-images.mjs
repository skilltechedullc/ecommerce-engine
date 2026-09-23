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

function extractStoragePath(value, bucketName) {
  if (!value || typeof value !== 'string') return ''
  const marker = `/storage/v1/object/public/${bucketName}/`
  const markerIndex = value.indexOf(marker)
  if (markerIndex >= 0) {
    return decodeURIComponent(value.slice(markerIndex + marker.length).split('?')[0])
  }
  return value.includes('://') ? '' : value.replace(/^\/+/, '')
}

async function listFiles(supabase, bucketName, prefix = '') {
  const { data, error } = await supabase.storage.from(bucketName).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    console.error(`Failed to list storage path "${prefix || '/'}": ${error.message}`)
    process.exit(1)
  }

  const files = []
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id === null) {
      files.push(...await listFiles(supabase, bucketName, path))
    } else {
      files.push(path)
    }
  }
  return files
}

async function addImageReferences(supabase, table, column, references, bucketName) {
  const { data, error } = await supabase.from(table).select(column).not(column, 'is', null)
  if (error) {
    console.error(`Failed to read ${table}.${column}: ${error.message}`)
    process.exit(1)
  }

  for (const row of data ?? []) {
    const path = extractStoragePath(row[column], bucketName)
    if (path) references.add(path)
  }
}

loadEnvFile(readArg('--env') ?? '.env.local')

const bucketName = readArg('--bucket') ?? 'product-images'
const shouldDelete = process.argv.includes('--delete')
const supabase = createClient(required('NEXT_PUBLIC_SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
})

const referenced = new Set()
await addImageReferences(supabase, 'products', 'image', referenced, bucketName)
await addImageReferences(supabase, 'product_images', 'url', referenced, bucketName)
await addImageReferences(supabase, 'product_variants', 'image', referenced, bucketName)
await addImageReferences(supabase, 'variant_images', 'url', referenced, bucketName)

const files = await listFiles(supabase, bucketName)
const unused = files.filter((path) => !referenced.has(path))

console.log(`Bucket: ${bucketName}`)
console.log(`Storage files: ${files.length}`)
console.log(`Referenced files: ${referenced.size}`)
console.log(`Unused files: ${unused.length}`)

for (const path of unused) {
  console.log(`${shouldDelete ? 'delete' : 'dry-run'} ${path}`)
}

if (shouldDelete && unused.length > 0) {
  const { error } = await supabase.storage.from(bucketName).remove(unused)
  if (error) {
    console.error(`Failed to delete unused files: ${error.message}`)
    process.exit(1)
  }
  console.log(`Deleted ${unused.length} unused files.`)
}

if (!shouldDelete) {
  console.log('Dry run only. Re-run with --delete to remove unused files.')
}
