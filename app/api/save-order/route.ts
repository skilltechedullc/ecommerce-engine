import { after, NextRequest } from 'next/server'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { storeConfig } from '@/lib/config'
import { notifyOrderPlaced } from '@/lib/server/notifications'
import {
  HttpError,
  assertArray,
  assertPositiveNumber,
  assertString,
  jsonOk,
  parseJson,
  withApiHandler,
} from '@/lib/server/api'
import { env } from '@/lib/server/env'
import {
  CheckoutHardeningError,
  aggregateCheckoutItems,
  amountToPaise,
  assertRazorpayPaymentMatches,
} from '@/lib/server/checkoutHardening'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { writeAuditLog } from '@/lib/server/audit'
import { calculateShippingRate } from '@/lib/shipping/rates'

const razorpay = new Razorpay({
  key_id: env('RAZORPAY_KEY_ID'),
  key_secret: env('RAZORPAY_KEY_SECRET'),
})

/*
  Required Supabase tables:

  orders (
    id          uuid primary key default gen_random_uuid(),
    customer_name    text not null,
    customer_email   text not null,
    customer_phone   text not null,
    customer_address text not null,
    total_amount     numeric not null,
    razorpay_order_id   text not null,
    razorpay_payment_id text not null,
    created_at  timestamptz default now()
  )

  order_items (
    id         uuid primary key default gen_random_uuid(),
    order_id   uuid references orders(id) on delete cascade,
    product_id text not null,
    product_name text not null,
    price      numeric not null,
    quantity   int not null
  )
*/

interface CustomerInfo {
  name: string
  email: string
  phone: string
  address: string
}

interface OrderItem {
  variant_id: string
  variant_name?: string
  quantity: number
}

type SaveOrderBody = {
  razorpay_order_id?: string
  razorpay_payment_id?: string
  razorpay_signature?: string
  customer?: CustomerInfo
  items?: OrderItem[]
}

type CheckoutSessionRow = {
  id: string
  razorpay_order_id: string
  amount_paise: number
  subtotal_amount: number
  shipping_amount: number
  currency: string
  status: string
}

type RazorpayPayment = {
  id: string
  order_id: string
  amount: number
  currency: string
  status: string
}

type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  status: string
}

type RazorpayClientWithFetch = Razorpay & {
  payments: {
    fetch(paymentId: string): Promise<RazorpayPayment>
  }
  orders: {
    fetch(orderId: string): Promise<RazorpayOrder>
  }
}

function validateCustomer(value: unknown): CustomerInfo {
  if (!value || typeof value !== 'object') {
    throw new HttpError(400, 'customer is required', 'VALIDATION_ERROR')
  }

  const customer = value as Partial<CustomerInfo>
  return {
    name: assertString(customer.name, 'customer.name'),
    email: assertString(customer.email, 'customer.email'),
    phone: assertString(customer.phone, 'customer.phone'),
    address: assertString(customer.address, 'customer.address'),
  }
}

function validateItems(value: unknown): OrderItem[] {
  const items = assertArray<OrderItem>(value, 'items')
  if (items.length === 0) {
    throw new HttpError(400, 'items must include at least one item', 'VALIDATION_ERROR')
  }

  return items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new HttpError(400, `items[${index}] is invalid`, 'VALIDATION_ERROR')
    }

    const quantity = assertPositiveNumber(item.quantity, `items[${index}].quantity`)
    if (!Number.isInteger(quantity)) {
      throw new HttpError(400, `items[${index}].quantity must be an integer`, 'VALIDATION_ERROR')
    }

    return {
      variant_id: assertString(item.variant_id, `items[${index}].variant_id`),
      quantity,
      variant_name: typeof item.variant_name === 'string' ? item.variant_name : undefined,
    }
  })
}

function verifyRazorpaySignature(input: {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}) {
  const body = `${input.razorpay_order_id}|${input.razorpay_payment_id}`
  const expectedSignature = crypto
    .createHmac('sha256', env('RAZORPAY_KEY_SECRET'))
    .update(body)
    .digest('hex')

  const expectedBuf = Buffer.from(expectedSignature, 'hex')
  const receivedBuf = Buffer.from(input.razorpay_signature, 'hex')

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    throw new HttpError(400, 'Payment verification failed', 'PAYMENT_VERIFICATION_FAILED')
  }
}

async function verifyRazorpayPayment(input: {
  razorpay_order_id: string
  razorpay_payment_id: string
  expectedAmountPaise: number
  expectedCurrency: string
}) {
  const client = razorpay as RazorpayClientWithFetch
  const [payment, order] = await Promise.all([
    client.payments.fetch(input.razorpay_payment_id),
    client.orders.fetch(input.razorpay_order_id),
  ])

  try {
    assertRazorpayPaymentMatches({
      razorpayOrderId: input.razorpay_order_id,
      razorpayPaymentId: input.razorpay_payment_id,
      expectedAmountPaise: input.expectedAmountPaise,
      expectedCurrency: input.expectedCurrency,
      payment,
      order,
    })
  } catch (error) {
    if (error instanceof CheckoutHardeningError) {
      throw new HttpError(error.status, error.message, error.code, error.details)
    }
    throw error
  }
}

async function updateCheckoutSession(input: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
  razorpayOrderId: string
  status: CheckoutSessionRow['status']
  razorpayPaymentId?: string
  orderId?: string
  failureReason?: string | null
}) {
  const payload: Record<string, unknown> = {
    status: input.status,
  }

  if (input.razorpayPaymentId) payload.razorpay_payment_id = input.razorpayPaymentId
  if (input.orderId) payload.order_id = input.orderId
  if (input.failureReason !== undefined) payload.failure_reason = input.failureReason

  const { error } = await input.supabaseAdmin
    .from('checkout_sessions')
    .update(payload)
    .eq('razorpay_order_id', input.razorpayOrderId)

  if (error) {
    throw new HttpError(500, error.message, 'DB_UPDATE_CHECKOUT_SESSION_FAILED')
  }
}

type CanonicalOrderItem = {
  variant_id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
}

async function validatePricingAndStock(input: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
  items: OrderItem[]
}): Promise<{ canonicalItems: CanonicalOrderItem[]; expectedTotal: number }> {
  const aggregatedItems = aggregateCheckoutItems(input.items)
  const itemByVariant = new Map(aggregatedItems.map((item) => [item.variant_id, item]))
  const uniqueVariantIds = aggregatedItems.map((item) => item.variant_id)

  const { data: variants, error: variantsError } = await input.supabaseAdmin
    .from('product_variants')
    .select('id, product_id, price, stock')
    .in('id', uniqueVariantIds)

  if (variantsError) {
    throw new HttpError(500, variantsError.message, 'DB_FETCH_FAILED')
  }

  const variantById = new Map((variants ?? []).map((v) => [String(v.id), v]))
  if (variantById.size !== uniqueVariantIds.length) {
    const missingVariantIds = uniqueVariantIds.filter((id) => !variantById.has(id))
    throw new HttpError(400, 'One or more variants are invalid', 'VALIDATION_ERROR', {
      missingVariantIds,
    })
  }

  const productIds = Array.from(new Set((variants ?? []).map((v) => String(v.product_id))))
  const { data: products, error: productsError } = await input.supabaseAdmin
    .from('products')
    .select('id, name, is_active')
    .in('id', productIds)

  if (productsError) {
    throw new HttpError(500, productsError.message, 'DB_FETCH_FAILED')
  }

  const productById = new Map((products ?? []).map((p) => [String(p.id), p]))

  let expectedTotal = 0
  const canonicalItems: CanonicalOrderItem[] = uniqueVariantIds.map((variantId, index) => {
    const item = itemByVariant.get(variantId)
    const dbVariant = variantById.get(String(variantId))
    if (!item) {
      throw new HttpError(400, `items[${index}] has invalid variant`, 'VALIDATION_ERROR')
    }

    if (!dbVariant) {
      throw new HttpError(400, `items[${index}] has invalid variant`, 'VALIDATION_ERROR')
    }

    const dbProduct = productById.get(String(dbVariant.product_id))
    if (!dbProduct || !dbProduct.is_active) {
      throw new HttpError(400, `items[${index}] references inactive product`, 'VALIDATION_ERROR')
    }

    const dbPrice = Number(dbVariant.price)
    const dbStock = Number(dbVariant.stock)
    if (item.quantity > dbStock) {
      throw new HttpError(
        400,
        `items[${index}] exceeds available stock (${dbStock})`,
        'INSUFFICIENT_STOCK'
      )
    }

    expectedTotal += dbPrice * item.quantity

    return {
      variant_id: String(dbVariant.id),
      product_id: String(dbVariant.product_id),
      product_name: `${dbProduct.name}${item.variant_name ? ` - ${item.variant_name}` : ''}`,
      price: dbPrice,
      quantity: item.quantity,
    }
  })

  return { canonicalItems, expectedTotal }
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, {
      keyPrefix: 'save-order',
      windowMs: 60 * 1000,
      maxRequests: 40,
    })

    const body = await parseJson<SaveOrderBody>(req)
    const razorpay_order_id = assertString(body.razorpay_order_id, 'razorpay_order_id')
    const razorpay_payment_id = assertString(body.razorpay_payment_id, 'razorpay_payment_id')
    const razorpay_signature = assertString(body.razorpay_signature, 'razorpay_signature')
    const customer = validateCustomer(body.customer)
    const items = validateItems(body.items)

    verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    })

    const supabaseAdmin = getSupabaseAdmin()

    const { data: checkoutSession, error: checkoutSessionError } = await supabaseAdmin
      .from('checkout_sessions')
      .select('id, razorpay_order_id, amount_paise, subtotal_amount, shipping_amount, currency, status')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle<CheckoutSessionRow>()

    if (checkoutSessionError) {
      throw new HttpError(500, checkoutSessionError.message, 'DB_FETCH_CHECKOUT_SESSION_FAILED')
    }

    if (!checkoutSession) {
      throw new HttpError(400, 'Checkout session not found', 'CHECKOUT_SESSION_NOT_FOUND')
    }

    if (checkoutSession.status === 'order_saved') {
      const { data: existingOrderBySession } = await supabaseAdmin
        .from('orders')
        .select('id, confirmation_token')
        .eq('razorpay_order_id', razorpay_order_id)
        .maybeSingle()

      if (existingOrderBySession?.id) {
        return jsonOk({ order_id: existingOrderBySession.id, confirmation_token: existingOrderBySession.confirmation_token, idempotent: true }, { requestId })
      }
    }

    const { canonicalItems, expectedTotal } = await validatePricingAndStock({
      supabaseAdmin,
      items,
    })

    const quote = calculateShippingRate(expectedTotal, undefined, { address: customer.address })
    const expectedAmountPaise = amountToPaise(quote.total)
    if (Number(checkoutSession.amount_paise) !== expectedAmountPaise) {
      await updateCheckoutSession({
        supabaseAdmin,
        razorpayOrderId: razorpay_order_id,
        status: 'payment_verification_failed',
        razorpayPaymentId: razorpay_payment_id,
        failureReason: 'Checkout amount changed before payment save',
      })
      throw new HttpError(409, 'Cart total changed. Please recreate checkout.', 'CHECKOUT_AMOUNT_CHANGED')
    }

    if (checkoutSession.currency !== storeConfig.currency) {
      await updateCheckoutSession({
        supabaseAdmin,
        razorpayOrderId: razorpay_order_id,
        status: 'payment_verification_failed',
        razorpayPaymentId: razorpay_payment_id,
        failureReason: 'Checkout currency mismatch',
      })
      throw new HttpError(400, 'Checkout currency mismatch', 'CHECKOUT_CURRENCY_MISMATCH')
    }

    try {
      await verifyRazorpayPayment({
        razorpay_order_id,
        razorpay_payment_id,
        expectedAmountPaise,
        expectedCurrency: checkoutSession.currency,
      })
    } catch (error) {
      await updateCheckoutSession({
        supabaseAdmin,
        razorpayOrderId: razorpay_order_id,
        status: 'payment_verification_failed',
        razorpayPaymentId: razorpay_payment_id,
        failureReason: error instanceof Error ? error.message : 'Payment verification failed',
      })
      throw error
    }

    await updateCheckoutSession({
      supabaseAdmin,
      razorpayOrderId: razorpay_order_id,
      status: 'payment_verified',
      razorpayPaymentId: razorpay_payment_id,
      failureReason: null,
    })

    await writeAuditLog({
      actorType: 'customer',
      action: 'payment.verified',
      entityType: 'checkout_session',
      entityId: checkoutSession.id,
      requestId,
      metadata: {
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amountPaise: expectedAmountPaise,
        subtotalAmount: quote.subtotal,
        shippingAmount: quote.shippingAmount,
        currency: checkoutSession.currency,
      },
    })

    const { data: saved, error: saveError } = await supabaseAdmin.rpc('complete_checkout', {
      p_order: {
        customer_name: customer.name, customer_email: customer.email,
        customer_phone: customer.phone, customer_address: customer.address,
        total_amount: quote.total, shipping_amount: quote.shippingAmount,
        payment_method: 'razorpay', razorpay_order_id, razorpay_payment_id,
      },
      p_items: canonicalItems,
    })
    if (saveError || !saved?.order_id) {
      await updateCheckoutSession({
        supabaseAdmin, razorpayOrderId: razorpay_order_id, status: 'order_save_failed',
        razorpayPaymentId: razorpay_payment_id, failureReason: saveError?.message ?? 'Order save failed',
      })
      throw new HttpError(409, 'Your payment was received but the order needs recovery. Please retry or contact support.', 'ORDER_SAVE_RETRY_REQUIRED')
    }
    const order = { id: String(saved.order_id) }
    const confirmationToken = String(saved.confirmation_token)

    await writeAuditLog({
      actorType: 'customer',
      action: 'order.create',
      entityType: 'order',
      entityId: order.id,
      requestId,
      metadata: {
        checkoutSessionId: checkoutSession.id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        subtotalAmount: quote.subtotal,
        shippingAmount: quote.shippingAmount,
        totalAmount: quote.total,
        itemCount: canonicalItems.length,
      },
    })

    // 5. Trigger centralized notifications (email + WhatsApp) with idempotency logs.
    after(() => notifyOrderPlaced(order.id))

    return jsonOk({ order_id: order.id, confirmation_token: confirmationToken }, { requestId })
  })
}
