import { NextRequest } from 'next/server'
import { HttpError } from '@/lib/server/api'
import { isProduction, optionalEnv } from '@/lib/server/env'

type RateLimitBucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  keyPrefix: string
  windowMs: number
  maxRequests: number
}

const buckets = new Map<string, RateLimitBucket>()

const UPSTASH_URL = optionalEnv('UPSTASH_REDIS_REST_URL')
const UPSTASH_TOKEN = optionalEnv('UPSTASH_REDIS_REST_TOKEN')

function upstashConfigured(): boolean {
  return Boolean(UPSTASH_URL && UPSTASH_TOKEN)
}

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}

function makeKey(req: NextRequest, keyPrefix: string): string {
  return `${keyPrefix}:${getClientIp(req)}`
}

async function enforceDistributedRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new HttpError(
      500,
      'Rate limiting is not configured for production',
      'RATE_LIMIT_CONFIG_ERROR'
    )
  }

  const bucketKey = `${key}:${Math.floor(Date.now() / options.windowMs)}`
  const ttlSeconds = Math.max(1, Math.ceil(options.windowMs / 1000))

  const headers = {
    Authorization: `Bearer ${UPSTASH_TOKEN}`,
    'Content-Type': 'application/json',
  }

  const incrResponse = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(bucketKey)}`, {
    method: 'POST',
    headers,
    cache: 'no-store',
  })

  if (!incrResponse.ok) {
    throw new HttpError(503, 'Rate limiter unavailable', 'RATE_LIMIT_BACKEND_UNAVAILABLE')
  }

  const incrPayload = (await incrResponse.json()) as { result?: number }
  const count = Number(incrPayload.result ?? 0)

  if (!Number.isFinite(count) || count <= 0) {
    throw new HttpError(503, 'Rate limiter unavailable', 'RATE_LIMIT_BACKEND_INVALID')
  }

  if (count === 1) {
    await fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(bucketKey)}/${ttlSeconds}`, {
      method: 'POST',
      headers,
      cache: 'no-store',
    })
  }

  if (count > options.maxRequests) {
    throw new HttpError(
      429,
      'Too many requests. Please try again later.',
      'RATE_LIMITED',
      { retryAfterSeconds: ttlSeconds }
    )
  }
}

export async function enforceRateLimit(req: NextRequest, options: RateLimitOptions): Promise<void> {
  const key = makeKey(req, options.keyPrefix)

  if (isProduction()) {
    if (upstashConfigured()) {
      await enforceDistributedRateLimit(key, options)
      return
    }

    throw new HttpError(
      500,
      'Rate limiting requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production',
      'RATE_LIMIT_CONFIG_ERROR'
    )
  }

  const now = Date.now()

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return
  }

  if (existing.count >= options.maxRequests) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000)
    throw new HttpError(
      429,
      'Too many requests. Please try again later.',
      'RATE_LIMITED',
      { retryAfterSeconds }
    )
  }

  existing.count += 1
  buckets.set(key, existing)
}
