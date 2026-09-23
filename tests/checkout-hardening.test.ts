import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  CheckoutHardeningError,
  aggregateCheckoutItems,
  amountToPaise,
  assertRazorpayPaymentMatches,
} from '../lib/server/checkoutHardening'
import { calculateShippingRate } from '../lib/shipping/rates'

test('aggregates duplicate variant quantities before stock checks', () => {
  const items = aggregateCheckoutItems([
    { variant_id: 'variant-a', quantity: 2, variant_name: '1kg' },
    { variant_id: 'variant-a', quantity: 3, variant_name: '1kg' },
    { variant_id: 'variant-b', quantity: 1, variant_name: '500g' },
  ])

  assert.deepEqual(items, [
    { variant_id: 'variant-a', quantity: 5, variant_name: '1kg' },
    { variant_id: 'variant-b', quantity: 1, variant_name: '500g' },
  ])
})

test('converts server-calculated totals to paise', () => {
  assert.equal(amountToPaise(499.99), 49999)
  assert.equal(amountToPaise(100), 10000)
})

test('calculates flat shipping and free-shipping threshold totals', () => {
  assert.deepEqual(calculateShippingRate(500, { flatRate: 49, freeShippingThreshold: 999 }), {
    subtotal: 500,
    shippingAmount: 49,
    total: 549,
    freeShippingApplied: false,
  })

  assert.deepEqual(calculateShippingRate(1000, { flatRate: 49, freeShippingThreshold: 999 }), {
    subtotal: 1000,
    shippingAmount: 0,
    total: 1000,
    freeShippingApplied: true,
  })
})

test('calculates advanced shipping zone rules', () => {
  assert.deepEqual(
    calculateShippingRate(400, {
      flatRate: 80,
      freeShippingThreshold: 0,
      zones: [{ name: 'Kochi', city: 'Kochi', flatRate: 25, freeShippingThreshold: 500 }],
    }, { address: 'MG Road, Kochi 682001' }),
    {
      subtotal: 400,
      shippingAmount: 25,
      total: 425,
      freeShippingApplied: false,
      matchedRule: 'Kochi',
    }
  )
})

test('rejects invalid checkout totals', () => {
  assert.throws(() => amountToPaise(0), CheckoutHardeningError)
  assert.throws(() => amountToPaise(Number.NaN), CheckoutHardeningError)
})

test('accepts matching captured Razorpay payment and order snapshots', () => {
  assert.doesNotThrow(() => assertRazorpayPaymentMatches({
    razorpayOrderId: 'order_123',
    razorpayPaymentId: 'pay_123',
    expectedAmountPaise: 12000,
    expectedCurrency: 'INR',
    payment: {
      id: 'pay_123',
      order_id: 'order_123',
      amount: 12000,
      currency: 'INR',
      status: 'captured',
    },
    order: {
      id: 'order_123',
      amount: 12000,
      currency: 'INR',
      status: 'paid',
    },
  }))
})

test('rejects stale price or tampered amount mismatch', () => {
  assert.throws(() => assertRazorpayPaymentMatches({
    razorpayOrderId: 'order_123',
    razorpayPaymentId: 'pay_123',
    expectedAmountPaise: 13000,
    expectedCurrency: 'INR',
    payment: {
      id: 'pay_123',
      order_id: 'order_123',
      amount: 12000,
      currency: 'INR',
      status: 'captured',
    },
    order: {
      id: 'order_123',
      amount: 12000,
      currency: 'INR',
      status: 'paid',
    },
  }), /Payment amount mismatch/)
})

test('rejects replayed or mismatched payment/order ids', () => {
  assert.throws(() => assertRazorpayPaymentMatches({
    razorpayOrderId: 'order_123',
    razorpayPaymentId: 'pay_123',
    expectedAmountPaise: 12000,
    expectedCurrency: 'INR',
    payment: {
      id: 'pay_replayed',
      order_id: 'order_123',
      amount: 12000,
      currency: 'INR',
      status: 'captured',
    },
    order: {
      id: 'order_123',
      amount: 12000,
      currency: 'INR',
      status: 'paid',
    },
  }), /Payment verification failed/)
})

test('rejects uncaptured payments', () => {
  assert.throws(() => assertRazorpayPaymentMatches({
    razorpayOrderId: 'order_123',
    razorpayPaymentId: 'pay_123',
    expectedAmountPaise: 12000,
    expectedCurrency: 'INR',
    payment: {
      id: 'pay_123',
      order_id: 'order_123',
      amount: 12000,
      currency: 'INR',
      status: 'authorized',
    },
    order: {
      id: 'order_123',
      amount: 12000,
      currency: 'INR',
      status: 'attempted',
    },
  }), /Payment is not captured yet/)
})

test('checkout session schema supports order-save failure recovery', () => {
  const migration = readFileSync('supabase/migrations/20260331000004_checkout_sessions.sql', 'utf8')
  const shippingMigration = readFileSync('supabase/migrations/20260331000013_shipping_amounts.sql', 'utf8')

  assert.match(migration, /order_save_failed/)
  assert.match(migration, /failure_reason/)
  assert.match(migration, /razorpay_payment_id/)
  assert.match(migration, /order_id uuid references public\.orders/)
  assert.match(shippingMigration, /shipping_amount/)
  assert.match(shippingMigration, /subtotal_amount/)
})

test('manual payment route is feature gated and records COD orders', () => {
  const route = readFileSync('app/api/create-manual-order/route.ts', 'utf8')
  const checkout = readFileSync('app/checkout/page.tsx', 'utf8')
  const migration = readFileSync('supabase/migrations/20260331000010_manual_payment_support.sql', 'utf8')

  assert.match(route, /NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS/)
  assert.match(route, /FEATURE_DISABLED/)
  assert.match(route, /payment_method: 'cod'/)
  assert.match(route, /complete_checkout/)
  assert.match(checkout, /manualPayments/)
  assert.match(checkout, /\/api\/create-manual-order/)
  assert.match(migration, /payment_method/)
  assert.match(migration, /whatsapp_cod/)
})

test('success page requires confirmation token before reading order details', () => {
  const saveOrder = readFileSync('app/api/save-order/route.ts', 'utf8')
  const manualOrder = readFileSync('app/api/create-manual-order/route.ts', 'utf8')
  const checkout = readFileSync('app/checkout/page.tsx', 'utf8')
  const successPage = readFileSync('app/success/page.tsx', 'utf8')
  const migration = readFileSync('supabase/migrations/20260331000011_order_confirmation_tokens.sql', 'utf8')

  assert.match(migration, /confirmation_token/)
  assert.match(saveOrder, /confirmationToken/)
  assert.match(manualOrder, /confirmationToken/)
  assert.match(checkout, /confirmation_token/)
  assert.match(successPage, /confirmationToken/)
  assert.match(successPage, /\.eq\('confirmation_token', confirmationToken\)/)
  assert.doesNotMatch(successPage, /params\.total/)
  assert.doesNotMatch(successPage, /params\.items/)
})
