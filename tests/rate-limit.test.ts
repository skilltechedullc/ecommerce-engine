import assert from 'node:assert/strict'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { enforceRateLimit } from '../lib/server/rateLimit'

test('production rate limiting fails closed with actionable errors and atomic expiry', async (t) => {
  const previous = { ...process.env }
  const fetchBefore = globalThis.fetch
  t.after(() => {
    globalThis.fetch = fetchBefore
    for (const key of ['NODE_ENV', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  })
  Object.assign(process.env, { NODE_ENV: 'production' })
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  const req = new NextRequest('https://demo.myshop.net/api/create-order')
  const options = { keyPrefix: 'test', windowMs: 60000, maxRequests: 2 }
  await assert.rejects(enforceRateLimit(req, options), { status: 503, code: 'RATE_LIMIT_CONFIG_ERROR' })
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.invalid'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
  globalThis.fetch = async () => { throw new TypeError('network down') }
  await assert.rejects(enforceRateLimit(req, options), { status: 503, code: 'RATE_LIMIT_BACKEND_UNAVAILABLE' })
  globalThis.fetch = async (_url, init) => {
    const command = JSON.parse(String(init?.body))
    assert.equal(command[0], 'EVAL')
    assert.match(command[1], /EXPIRE/)
    return Response.json({ result: 1 })
  }
  await enforceRateLimit(req, options)
  globalThis.fetch = async () => Response.json({ result: 3 })
  await assert.rejects(enforceRateLimit(req, options), { status: 429, code: 'RATE_LIMITED' })
  globalThis.fetch = async () => Response.json({ result: 'not-a-number' })
  await assert.rejects(enforceRateLimit(req, options), { code: 'RATE_LIMIT_BACKEND_UNAVAILABLE' })
})
