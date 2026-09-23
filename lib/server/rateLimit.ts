import { NextRequest } from 'next/server'
import { HttpError } from '@/lib/server/api'
import { isProduction, optionalEnv } from '@/lib/server/env'

type RateLimitOptions = { keyPrefix: string; windowMs: number; maxRequests: number }
const buckets = new Map<string, { count: number; resetAt: number }>()

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export async function enforceRateLimit(req: NextRequest, options: RateLimitOptions): Promise<void> {
  const key = options.keyPrefix + ':' + clientIp(req)
  if (isProduction()) {
    const url = optionalEnv('UPSTASH_REDIS_REST_URL')
    const token = optionalEnv('UPSTASH_REDIS_REST_TOKEN')
    if (!url || !token) {
      throw new HttpError(503, 'Rate limiting is not configured. Please contact the store.', 'RATE_LIMIT_CONFIG_ERROR')
    }
    const ttl = Math.max(1, Math.ceil(options.windowMs / 1000))
    const bucketKey = key + ':' + Math.floor(Date.now() / options.windowMs)
    let count: number
    try {
      // Increment and expiry are atomic: an interrupted request cannot leave an immortal bucket.
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL',
          "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return n",
          1, bucketKey, ttl]),
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) throw new Error('Rate limit service rejected request')
      const payload = await response.json() as { result?: unknown; error?: unknown }
      if (payload.error || typeof payload.result !== 'number' || !Number.isSafeInteger(payload.result) || payload.result < 1) {
        throw new Error('Invalid rate limit response')
      }
      count = payload.result
    } catch {
      throw new HttpError(503, 'The store is temporarily unavailable. Please try again shortly.', 'RATE_LIMIT_BACKEND_UNAVAILABLE')
    }
    if (count > options.maxRequests) {
      throw new HttpError(429, 'Too many requests. Please try again later.', 'RATE_LIMITED', { retryAfterSeconds: ttl })
    }
    return
  }

  const now = Date.now()
  if (buckets.size > 1000) {
    for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey)
  }
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return
  }
  if (bucket.count >= options.maxRequests) {
    throw new HttpError(429, 'Too many requests. Please try again later.', 'RATE_LIMITED', {
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    })
  }
  bucket.count += 1
}
