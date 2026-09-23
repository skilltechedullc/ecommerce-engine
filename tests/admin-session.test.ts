import assert from 'node:assert/strict'
import test from 'node:test'
import crypto from 'node:crypto'
import { createAdminSessionToken, parseAdminSessionToken } from '../lib/server/adminSession'
import { NextRequest } from 'next/server'
import { enforceSameOriginMutation } from '../lib/server/csrf'

test('admin tokens reject tampering, expired sessions, legacy versions and trailing data', (t) => {
  const previous = process.env.ADMIN_SESSION_SECRET
  process.env.ADMIN_SESSION_SECRET = 'a'.repeat(40)
  t.after(() => { if (previous === undefined) delete process.env.ADMIN_SESSION_SECRET; else process.env.ADMIN_SESSION_SECRET = previous })
  const token = createAdminSessionToken({ role: 'super_admin' })
  assert.equal(parseAdminSessionToken(token)?.role, 'super_admin')
  assert.equal(parseAdminSessionToken(token + '.trailing'), null)
  assert.equal(parseAdminSessionToken(token.slice(0, -4) + 'oops'), null)
  const sign = (payload: object) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
    return encoded + '.' + crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(encoded).digest('base64url')
  }
  const now = Math.floor(Date.now() / 1000)
  assert.equal(parseAdminSessionToken(sign({ iat: now - 10, exp: now - 1, v: 2 })), null)
  assert.equal(parseAdminSessionToken(sign({ iat: now, exp: now + 100, v: 1 })), null)
  assert.equal(parseAdminSessionToken(sign({ iat: now, exp: now + 999999, v: 2 })), null)
})

test('admin mutations require origin evidence but accept localhost during development', () => {
  assert.throws(() => enforceSameOriginMutation(new NextRequest('https://store.test/api/admin/users', { method: 'POST' })), /Cross-site/)
  assert.doesNotThrow(() => enforceSameOriginMutation(new NextRequest('http://localhost:3000/api/admin/users', {
    method: 'POST', headers: { host: 'localhost:3000', origin: 'http://localhost:3000' },
  })))
})
