#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

function parseArgs(argv) {
  const args = { port: '3001', baseEnv: '.env.local' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--client') args.client = argv[index + 1]
    if (arg === '--port') args.port = argv[index + 1] ?? args.port
    if (arg === '--base-env') args.baseEnv = argv[index + 1] ?? args.baseEnv
  }
  return args
}

function parseEnvFile(path) {
  const env = {}
  if (!existsSync(path)) return env

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    const rawValue = trimmed.slice(separator + 1).trim()
    env[key] = rawValue.replace(/^"(.*)"$/, '$1')
  }

  return env
}

function mergePreviewEnv(baseEnv, clientEnv, port) {
  const merged = { ...baseEnv }

  for (const [key, value] of Object.entries(clientEnv)) {
    if (value.trim()) merged[key] = value
  }

  merged.NODE_ENV = 'development'
  merged.PORT = port
  merged.NEXT_PUBLIC_SITE_URL = `http://localhost:${port}`

  if (!merged.NEXT_PUBLIC_STORE_PRESET || !['generic', 'millco'].includes(merged.NEXT_PUBLIC_STORE_PRESET)) {
    merged.NEXT_PUBLIC_STORE_PRESET = 'generic'
  }

  if (!merged.NEXT_PUBLIC_THEME_PRESET && clientEnv.NEXT_PUBLIC_STORE_PRESET) {
    merged.NEXT_PUBLIC_THEME_PRESET = clientEnv.NEXT_PUBLIC_STORE_PRESET
  }

  if (clientEnv.PAYMENT_PROVIDER === 'manual') {
    merged.NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS = 'true'
  }

  return merged
}

const args = parseArgs(process.argv.slice(2))
if (!args.client) {
  console.error('Usage: npm.cmd run client:preview -- --client <client-slug> [--port 3001]')
  process.exit(1)
}

const root = process.cwd()
const clientEnvPath = resolve(root, 'clients', args.client, '.env.template')
if (!existsSync(clientEnvPath)) {
  console.error(`Client env template not found: ${clientEnvPath}`)
  process.exit(1)
}

const env = mergePreviewEnv(
  parseEnvFile(resolve(root, args.baseEnv)),
  parseEnvFile(clientEnvPath),
  args.port
)

const nextBin = resolve(root, 'node_modules', 'next', 'dist', 'bin', 'next')
const child = spawn(process.execPath, [nextBin, 'dev', '--webpack', '-p', args.port], {
  cwd: root,
  env: { ...process.env, ...env },
  stdio: 'inherit',
  windowsHide: false,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
