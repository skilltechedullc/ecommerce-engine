import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
const env = parseEnv(readFileSync(process.argv[2] || '.env.fresh', 'utf8'))
const checks = [
  ['Supabase public API', env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL + '/auth/v1/settings', { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY }],
  ['Supabase server API', env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    ...(env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') ? { Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } : {}),
  }],
  ['Supabase commerce schema', env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/products?select=id&limit=0', {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    ...(env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') ? { Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } : {}),
  }],
  ['Upstash Redis', env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_URL + '/ping', {
    Authorization: env.UPSTASH_REDIS_REST_TOKEN ? 'Bearer ' + env.UPSTASH_REDIS_REST_TOKEN : undefined,
  }],
]
for (const [name, url, headers] of checks) {
  if (!url || Object.values(headers).some(v => !v)) { console.log(name + ': missing settings'); process.exitCode = 1; continue }
  try {
    const response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(15000) })
    console.log(name + ': HTTP ' + response.status + (response.ok ? ' OK' : ' — requires attention'))
    if (!response.ok) process.exitCode = 1
  } catch { console.log(name + ': connection failed'); process.exitCode = 1 }
}
