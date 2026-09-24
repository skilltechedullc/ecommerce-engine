import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { createClient } from '@supabase/supabase-js'

test('captured checkout recovers without browser callback, is idempotent and rejects payment mismatch', async () => {
  const env = parseEnv(readFileSync('.env.local-test', 'utf8'))
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname), 'Local database only')
  Object.assign(process.env, env)
  const { recoverCapturedCheckout } = await import('../../lib/server/recoverCheckout')
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)
  const product = crypto.randomUUID(); const variant = crypto.randomUUID()
  const ref = 'order_recovery_' + crypto.randomUUID(); const pay = 'pay_recovery_' + crypto.randomUUID()
  const customer = { name: 'Recovery fixture', email: 'recovery-' + product + '@example.invalid', phone: '9000090000', address: 'Local test only' }
  let recovered: string | null = null
  async function ok(result: { error: unknown }) { assert.equal(result.error, null) }
  const snapshots = async () => [
    { id: pay, order_id: ref, amount: 10000, currency: 'INR', status: 'captured' },
    { id: ref, amount: 10000, currency: 'INR', status: 'paid' },
  ] as unknown as Awaited<ReturnType<NonNullable<Parameters<typeof recoverCapturedCheckout>[2]>>>
  try {
    await ok(await db.from('products').insert({ id: product, name: 'Recovery fixture', slug: 'recovery-' + product, is_active: true }))
    await ok(await db.from('product_variants').insert({ id: variant, product_id: product, weight: 'Test', price: 100, stock: 5 }))
    await ok(await db.from('checkout_sessions').insert({ razorpay_order_id: ref, amount_paise: 10000, subtotal_amount: 100, shipping_amount: 0,
      currency: 'INR', customer, status: 'created', items: [{ variant_id: variant, product_id: product, product_name: 'Recovery fixture', price: 100, quantity: 1 }] }))
    recovered = await recoverCapturedCheckout(ref, pay, snapshots)
    assert.ok(recovered)
    assert.equal(await recoverCapturedCheckout(ref, pay, snapshots), recovered)
    const order = await db.from('orders').select('status, customer_email').eq('id', recovered).single()
    assert.equal(order.data?.status, 'Paid'); assert.equal(order.data?.customer_email, customer.email)
    const stock = await db.from('product_variants').select('stock').eq('id', variant).single()
    assert.equal(stock.data?.stock, 4)
    const invalid = async () => { const pair = await snapshots(); pair[0].amount = 1; return pair }
    await assert.rejects(recoverCapturedCheckout(ref, pay, invalid), /amount mismatch/)
    assert.equal(await recoverCapturedCheckout('order_unrelated_store', pay, snapshots), null)
    const items = await db.from('order_items').select('id').eq('order_id', recovered)
    assert.equal(items.data?.length, 1)
  } finally {
    await ok(await db.from('checkout_sessions').delete().eq('razorpay_order_id', ref))
    if (recovered) { await ok(await db.from('order_items').delete().eq('order_id', recovered)); await ok(await db.from('orders').delete().eq('id', recovered)) }
    await ok(await db.from('product_variants').delete().eq('id', variant))
    await ok(await db.from('products').delete().eq('id', product))
    await ok(await db.from('customers').delete().eq('email', customer.email))
  }
})
