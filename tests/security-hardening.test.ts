import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { NextRequest } from 'next/server'
import { enforceSameOriginMutation } from '../lib/server/csrf'
import { assertAllowedImageSignature, assertImageDimensions } from '../lib/server/fileValidation'
import { verifyMetaWebhookSignature } from '../lib/server/metaWebhook'

test('same-origin admin mutation check accepts matching origin', () => {
  const req = new NextRequest('https://shop.example.com/api/products/create', {
    method: 'POST',
    headers: {
      host: 'shop.example.com',
      origin: 'https://shop.example.com',
      'x-forwarded-proto': 'https',
    },
  })

  assert.doesNotThrow(() => enforceSameOriginMutation(req))
})

test('same-origin admin mutation check rejects cross-site origin', () => {
  const req = new NextRequest('https://shop.example.com/api/products/create', {
    method: 'POST',
    headers: {
      host: 'shop.example.com',
      origin: 'https://evil.example.com',
      'x-forwarded-proto': 'https',
    },
  })

  assert.throws(() => enforceSameOriginMutation(req), /Cross-site admin request blocked/)
})

test('image signature validation accepts matching png signature', () => {
  assert.doesNotThrow(() => assertAllowedImageSignature(
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    'image/png'
  ))
})

test('image signature validation rejects MIME spoofing', () => {
  assert.throws(() => assertAllowedImageSignature(
    new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    'image/png'
  ), /File content does not match/)
})

test('image dimension validation rejects oversized png images', () => {
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x17, 0x71,
    0x00, 0x00, 0x03, 0xe8,
  ])

  assert.throws(() => assertImageDimensions(bytes, 'image/png', {
    maxWidth: 6000,
    maxHeight: 6000,
    maxPixels: 24_000_000,
  }), /Image dimensions exceed/)
})

test('upload route sanitizes supported images before storage', () => {
  const route = readFileSync('app/api/upload/route.ts', 'utf8')

  assert.match(route, /sharp/)
  assert.match(route, /sanitizeImage/)
  assert.match(route, /media_assets/)
})

test('Meta webhook signature is optional outside production when no secret is configured', () => {
  assert.doesNotThrow(() => verifyMetaWebhookSignature({
    rawBody: '{"ok":true}',
    signatureHeader: null,
  }))
})

test('admin permissions define least-privilege role foundations', () => {
  const permissions = readFileSync('lib/server/permissions.ts', 'utf8')
  const phase15 = readFileSync('docs/PHASE15_ADMIN_USERS_ROLES.md', 'utf8')

  for (const role of ['owner', 'product_manager', 'order_manager', 'support', 'developer']) {
    assert.match(permissions, new RegExp(role))
    assert.match(phase15, new RegExp(role))
  }

  assert.match(permissions, /ROLE_PERMISSIONS/)
  assert.match(permissions, /orders:update-status/)
  assert.match(permissions, /settings:update/)
  assert.match(permissions, /admin-users:manage/)
  assert.match(permissions, /media:manage/)
  assert.doesNotMatch(permissions, /support: \[[\s\S]*?settings:update/)
})
