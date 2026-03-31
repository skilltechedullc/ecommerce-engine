import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
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
import { enforceRateLimit } from '@/lib/server/rateLimit'

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
  const variantIds = input.items.map((item) => item.variant_id)

  const uniqueVariantIds = Array.from(new Set(variantIds.map((id) => String(id))))

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
  const canonicalItems: CanonicalOrderItem[] = input.items.map((item, index) => {
    const dbVariant = variantById.get(String(item.variant_id))
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

function aggregateVariantQuantities(items: CanonicalOrderItem[]): Array<{ variant_id: string; quantity: number }> {
  const quantityByVariant = new Map<string, number>()
  for (const item of items) {
    quantityByVariant.set(
      item.variant_id,
      (quantityByVariant.get(item.variant_id) ?? 0) + item.quantity
    )
  }

  return Array.from(quantityByVariant.entries()).map(([variant_id, quantity]) => ({
    variant_id,
    quantity,
  }))
}

async function adjustVariantStockWithCas(input: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
  variantId: string
  delta: number
}): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: variant, error: fetchError } = await input.supabaseAdmin
      .from('product_variants')
      .select('stock')
      .eq('id', input.variantId)
      .maybeSingle()

    if (fetchError) {
      throw new HttpError(500, fetchError.message, 'DB_FETCH_FAILED')
    }

    if (!variant) {
      throw new HttpError(400, 'One or more variants are invalid', 'VALIDATION_ERROR')
    }

    const currentStock = Number(variant.stock)
    const nextStock = currentStock + input.delta
    if (!Number.isFinite(currentStock) || nextStock < 0) {
      return false
    }

    const { data: updated, error: updateError } = await input.supabaseAdmin
      .from('product_variants')
      .update({ stock: nextStock })
      .eq('id', input.variantId)
      .eq('stock', currentStock)
      .select('id')
      .maybeSingle()

    if (updateError) {
      throw new HttpError(500, updateError.message, 'DB_UPDATE_FAILED')
    }

    if (updated) {
      return true
    }
  }

  return false
}

async function reserveStockOrThrow(input: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
  items: CanonicalOrderItem[]
}): Promise<void> {
  const reservations = aggregateVariantQuantities(input.items)
  const reserved: Array<{ variant_id: string; quantity: number }> = []

  for (const reservation of reservations) {
    const success = await adjustVariantStockWithCas({
      supabaseAdmin: input.supabaseAdmin,
      variantId: reservation.variant_id,
      delta: -reservation.quantity,
    })

    if (!success) {
      for (const rollbackItem of reserved) {
        await adjustVariantStockWithCas({
          supabaseAdmin: input.supabaseAdmin,
          variantId: rollbackItem.variant_id,
          delta: rollbackItem.quantity,
        }).catch(() => undefined)
      }

      throw new HttpError(
        409,
        'One or more items went out of stock during checkout. Please try again.',
        'INSUFFICIENT_STOCK'
      )
    }

    reserved.push(reservation)
  }
}

async function restoreStock(input: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
  items: CanonicalOrderItem[]
}): Promise<void> {
  const reservations = aggregateVariantQuantities(input.items)
  for (const reservation of reservations) {
    await adjustVariantStockWithCas({
      supabaseAdmin: input.supabaseAdmin,
      variantId: reservation.variant_id,
      delta: reservation.quantity,
    }).catch(() => undefined)
  }
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

    const { canonicalItems, expectedTotal } = await validatePricingAndStock({
      supabaseAdmin,
      items,
    })

    // 1. Idempotency guard: if payment id was already saved, return existing order.
    const { data: existingOrderByPayment } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('razorpay_payment_id', razorpay_payment_id)
      .maybeSingle()

    if (existingOrderByPayment?.id) {
      return jsonOk({ order_id: existingOrderByPayment.id, idempotent: true }, { requestId })
    }

    // 2. Reserve stock before writing order to avoid overselling.
    await reserveStockOrThrow({ supabaseAdmin, items: canonicalItems })

    // 3. Insert order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_address: customer.address,
        total_amount: expectedTotal,
        source: 'web',
        razorpay_order_id,
        razorpay_payment_id,
      })
      .select('id')
      .single()

    if (orderError) {
      // Retry safety for race conditions where duplicate payment id insert fails.
      const { data: existingAfterConflict } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('razorpay_payment_id', razorpay_payment_id)
        .maybeSingle()

      if (existingAfterConflict?.id) {
        await restoreStock({ supabaseAdmin, items: canonicalItems })
        return jsonOk({ order_id: existingAfterConflict.id, idempotent: true }, { requestId })
      }

      await restoreStock({ supabaseAdmin, items: canonicalItems })

      throw new HttpError(500, orderError.message, 'DB_INSERT_ORDER_FAILED')
    }

    // 4. Insert order items
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
      canonicalItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity,
      }))
    )

    if (itemsError) {
      await supabaseAdmin.from('orders').delete().eq('id', order.id)
      await restoreStock({ supabaseAdmin, items: canonicalItems })
      throw new HttpError(500, itemsError.message, 'DB_INSERT_ORDER_ITEMS_FAILED')
    }

    // 5. Trigger centralized notifications (email + WhatsApp) with idempotency logs.
    void notifyOrderPlaced(order.id).catch(() => undefined)

    return jsonOk({ order_id: order.id }, { requestId })
  })
}
