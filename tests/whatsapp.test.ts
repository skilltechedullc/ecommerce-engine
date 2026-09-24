import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { senderOwnsOrder, trackWhatsAppOrder, safeTrackingUrl } from '../lib/whatsapp/tracking'
import { deterministicIntent, parseIntent, interpretIntent } from '../lib/whatsapp/intent'
import { parseMessages } from '../lib/whatsapp/webhookPayload'
import { processMessage } from '../lib/whatsapp/inbox'
import { importedCartSchema } from '../lib/whatsapp/importCart'
import { verifyMetaWebhookSignature } from '../lib/server/metaWebhook'

const id = '00000000-0000-4000-8000-000000000011'
test('WhatsApp ownership uses the full international sender, never a suffix or text-supplied number', () => {
  assert.equal(senderOwnsOrder('919876543210', '9876543210'), true)
  assert.equal(senderOwnsOrder('919876543210', '+91 98765 43210'), true)
  assert.equal(senderOwnsOrder('449876543210', '9876543210'), false)
  assert.equal(senderOwnsOrder('919876543211', '9876543210'), false)
  assert.equal(senderOwnsOrder('', ''), false)
})
test('tracking denies another customer without disclosing status or shipment data', async () => {
  const order = { id, customer_phone: '9876543210', status: 'Shipped', shipments: [{ awb_number: 'PRIVATE-AWB', tracking_url: 'https://carrier.example/track' }] }
  const denied = await trackWhatsAppOrder('919876543211', 'track ' + id + ' phone 9876543210', async () => order)
  assert.doesNotMatch(denied, /Shipped|PRIVATE-AWB|carrier/)
  const missing = await trackWhatsAppOrder('919876543211', id, async () => null)
  assert.equal(denied, missing)
  const allowed = await trackWhatsAppOrder('919876543210', id, async () => order)
  assert.match(allowed, /Shipped/)
  assert.match(allowed, /PRIVATE-AWB/)
})
test('tracking asks for the full id without querying all orders', async () => {
  let queries = 0
  assert.match(await trackWhatsAppOrder('919876543210', 'track ORD-123456', async () => { queries++; return null }), /full order ID/)
  assert.equal(queries, 0)
  assert.equal(safeTrackingUrl('javascript:alert(1)'), null)
  assert.equal(safeTrackingUrl('https://user:pass@carrier.example'), null)
})
test('AI classification cannot provide a phone, order status or arbitrary action', async () => {
  assert.equal(parseIntent({ intent: 'delete_order', phone: 'other' }), 'unknown')
  assert.equal(parseIntent({ status: 'Delivered' }), 'unknown')
  assert.equal(deterministicIntent('where is my order?'), 'track')
  const previous = process.env.WHATSAPP_AI_ENABLED
  process.env.WHATSAPP_AI_ENABLED = 'false'
  try { assert.equal(await interpretIntent('unrecognised query'), 'unknown') }
  finally { if (previous === undefined) delete process.env.WHATSAPP_AI_ENABLED; else process.env.WHATSAPP_AI_ENABLED = previous }
})
test('webhook parser handles batches, ignores wrong business numbers and uses from identity', () => {
  const message = { id: 'wamid.1', type: 'text', from: '919876543210', text: { body: 'track phone 919999999999' } }
  const body = { object: 'whatsapp_business_account', entry: [{ changes: [
    { value: { metadata: { phone_number_id: 'wrong' }, messages: [message] } },
    { value: { metadata: { phone_number_id: 'ours' }, messages: [message, { ...message, id: 'wamid.2' }] } },
  ] }] }
  const parsed = parseMessages(body, 'ours')
  assert.equal(parsed.length, 2)
  assert.equal(parsed[0].phone, '919876543210')
})
test('signed webhook rejects modified payload', () => {
  const old = process.env.WHATSAPP_APP_SECRET
  process.env.WHATSAPP_APP_SECRET = 'synthetic-unit-test-secret'
  const rawBody = '{"message":"test"}'
  const signatureHeader = 'sha256=' + crypto.createHmac('sha256', process.env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex')
  try {
    assert.doesNotThrow(() => verifyMetaWebhookSignature({ rawBody, signatureHeader }))
    assert.throws(() => verifyMetaWebhookSignature({ rawBody, signatureHeader: signatureHeader + 'junk' }))
    assert.throws(() => verifyMetaWebhookSignature({ rawBody: rawBody + ' ', signatureHeader }))
  } finally { if (old === undefined) delete process.env.WHATSAPP_APP_SECRET; else process.env.WHATSAPP_APP_SECRET = old }
})
function fakeInbox() {
  const values = new Map<string, string>(); let busy = false
  return { values, setBusy: (value: boolean) => { busy = value }, command: async (args: unknown[]) => {
    const [op, key, value] = args
    if (op === 'GET') return values.get(String(key)) ?? null
    if (op === 'SET') {
      if (args.includes('NX') && busy) return null
      values.set(String(key), String(value)); return 'OK'
    }
    if (op === 'EVAL') return 1
    throw new Error('Unexpected command')
  } }
}
test('duplicate webhook and send retry reuse prepared replies without mutating cart twice', async () => {
  const fake = fakeInbox(); let prepared = 0; let sends = 0; let fail = true
  const deps = { command: fake.command, prepare: async () => { prepared++; return ['first', 'second'] }, send: async () => { sends++; if (fail) { fail = false; throw new Error('provider offline') } } }
  const message = { id: 'wamid.test', phone: '919876543210', text: '1' }
  await assert.rejects(processMessage(message, deps))
  await processMessage(message, deps)
  await processMessage(message, deps)
  assert.equal(prepared, 1); assert.equal(sends, 3)
})
test('concurrent sender processing fails retryably instead of changing a cart concurrently', async () => {
  const fake = fakeInbox(); fake.setBusy(true)
  await assert.rejects(processMessage({ id: '2', phone: '919876543210', text: '1' }, { command: fake.command, prepare: async () => { throw new Error('must not execute') }, send: async () => {} }), /Sender busy/)
})
test('cart handoff rejects tampered quantities and duplicate variants and strips client prices', () => {
  assert.equal(importedCartSchema.safeParse([{ variant_id: id, quantity: -1 }]).success, false)
  assert.equal(importedCartSchema.safeParse([{ variant_id: id, quantity: 1 }, { variant_id: id, quantity: 2 }]).success, false)
  assert.deepEqual(importedCartSchema.parse([{ variant_id: id, quantity: 2, price: 0.01 }]), [{ variant_id: id, quantity: 2 }])
})
