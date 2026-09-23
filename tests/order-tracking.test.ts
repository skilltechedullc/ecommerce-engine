import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('customer order tracking requires order id and phone', () => {
  const route = readFileSync('app/api/orders/track/route.ts', 'utf8')
  const page = readFileSync('app/orders/track/page.tsx', 'utf8')

  assert.match(route, /orderId/)
  assert.match(route, /phone/)
  assert.match(route, /customer_phone/)
  assert.match(route, /ORDER_NOT_FOUND/)
  assert.doesNotMatch(route, /customer_email/)
  assert.match(page, /Track your order/)
  assert.match(page, /\/api\/orders\/track/)
})

test('phase 14 order shipping notification report exists', () => {
  const report = readFileSync('docs/PHASE14_ORDERS_SHIPPING_NOTIFICATIONS.md', 'utf8')

  assert.match(report, /Customer order tracking/)
  assert.match(report, /Manual shipping provider/)
  assert.match(report, /Shipping provider adapter pattern/)
  assert.match(report, /Failed notification retry/)
})

test('customer receipt page uses order tracking lookup instead of public order read', () => {
  const receiptPage = readFileSync('app/orders/receipt/ReceiptClient.tsx', 'utf8')
  const trackingPage = readFileSync('app/orders/track/page.tsx', 'utf8')

  assert.match(receiptPage, /Order ID/)
  assert.match(receiptPage, /Phone/)
  assert.match(receiptPage, /\/api\/orders\/track/)
  assert.match(receiptPage, /window\.print/)
  assert.match(trackingPage, /\/orders\/receipt/)
})

test('notification template editor and API are available for admin', () => {
  const route = readFileSync('app/api/admin/notification-templates/route.ts', 'utf8')
  const page = readFileSync('app/admin/(protected)/settings/notifications/page.tsx', 'utf8')
  const editor = readFileSync('app/admin/(protected)/settings/notifications/NotificationTemplateEditor.tsx', 'utf8')
  const migration = readFileSync('supabase/migrations/20260331000012_notification_templates.sql', 'utf8')

  assert.match(route, /notification_templates/)
  assert.match(route, /settings:update/)
  assert.match(page, /Template editor/)
  assert.match(editor, /Save Template/)
  assert.match(migration, /create table if not exists public\.notification_templates/)
})
