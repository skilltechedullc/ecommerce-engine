import crypto from 'crypto'
import { after, NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { notifyOrderPlaced } from '@/lib/server/notifications'
import { writeAuditLog } from '@/lib/server/audit'
import {
  HttpError,
  assertArray,
  assertPositiveNumber,
  assertString,
  jsonOk,
  parseJson,
  withApiHandler,
} from '@/lib/server/api'
import { aggregateCheckoutItems } from '@/lib/server/checkoutHardening'
import { optionalEnv } from '@/lib/server/env'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { calculateShippingRate } from '@/lib/shipping/rates'

type CustomerInfo = {
  name: string
  email: string
  phone: string
  address: string
}

type ManualOrderBody = {
  customer?: CustomerInfo
  items?: RawManualOrderItem[]
}

type RawManualOrderItem = {
  variant_id?: string
  variant_name?: string
  quantity?: number
}

type ParsedOrderItem = {
  variant_id: string
  variant_name?: string
  quantity: number
}

type CanonicalOrderItem = {
  variant_id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
}

function featureEnabled(name: string): boolean {
  return ['1', 'true', 'yes', 'on'].includes((optionalEnv(name) ?? '').toLowerCase())
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

function validateItems(value: unknown): ParsedOrderItem[] {
  const items = assertArray<RawManualOrderItem>(value, 'items')
  if (items.length === 0) {
    throw new HttpError(400, 'items must include at least one item', 'VALIDATION_ERROR')
  }

  return aggregateCheckoutItems(items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new HttpError(400, `items[${index}] is invalid`, 'VALIDATION_ERROR')
    }

    const quantity = assertPositiveNumber(item.quantity, `items[${index}].quantity`)
    if (!Number.isInteger(quantity)) {
      throw new HttpError(400, `items[${index}].quantity must be an integer`, 'VALIDATION_ERROR')
    }

    return {
      variant_id: assertString(item.variant_id, `items[${index}].variant_id`),
      variant_name: typeof item.variant_name === 'string' ? item.variant_name : undefined,
      quantity,
    }
  }))
}

async function validatePricingAndStock(input: {
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>
  items: ParsedOrderItem[]
}): Promise<{ canonicalItems: CanonicalOrderItem[]; expectedTotal: number }> {
  const variantIds = input.items.map((item) => item.variant_id)
  const itemByVariant = new Map(input.items.map((item) => [item.variant_id, item]))

  const { data: variants, error: variantsError } = await input.supabaseAdmin
    .from('product_variants')
    .select('id, product_id, price, stock')
    .in('id', variantIds)

  if (variantsError) {
    throw new HttpError(500, variantsError.message, 'DB_FETCH_FAILED')
  }

  const variantById = new Map((variants ?? []).map((variant) => [String(variant.id), variant]))
  if (variantById.size !== variantIds.length) {
    throw new HttpError(400, 'One or more variants are invalid', 'VALIDATION_ERROR')
  }

  const productIds = Array.from(new Set((variants ?? []).map((variant) => String(variant.product_id))))
  const { data: products, error: productsError } = await input.supabaseAdmin
    .from('products')
    .select('id, name, is_active')
    .in('id', productIds)

  if (productsError) {
    throw new HttpError(500, productsError.message, 'DB_FETCH_FAILED')
  }

  const productById = new Map((products ?? []).map((product) => [String(product.id), product]))
  let expectedTotal = 0

  const canonicalItems = variantIds.map((variantId, index) => {
    const item = itemByVariant.get(variantId)
    const dbVariant = variantById.get(variantId)
    if (!item || !dbVariant) {
      throw new HttpError(400, `items[${index}] has invalid variant`, 'VALIDATION_ERROR')
    }

    const dbProduct = productById.get(String(dbVariant.product_id))
    if (!dbProduct || !dbProduct.is_active) {
      throw new HttpError(400, `items[${index}] references inactive product`, 'VALIDATION_ERROR')
    }

    const dbPrice = Number(dbVariant.price)
    const dbStock = Number(dbVariant.stock)
    if (!Number.isFinite(dbPrice) || dbPrice <= 0) {
      throw new HttpError(400, `items[${index}] has invalid price`, 'VALIDATION_ERROR')
    }

    if (item.quantity > dbStock) {
      throw new HttpError(400, `items[${index}] exceeds available stock (${dbStock})`, 'INSUFFICIENT_STOCK')
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
    if (!featureEnabled('NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS')) {
      throw new HttpError(403, 'Manual payment mode is not enabled for this store', 'FEATURE_DISABLED')
    }

    await enforceRateLimit(req, {
      keyPrefix: 'create-manual-order',
      windowMs: 60 * 1000,
      maxRequests: 20,
    })

    const body = await parseJson<ManualOrderBody>(req)
    const customer = validateCustomer(body.customer)
    const items = validateItems(body.items)
    const supabaseAdmin = getSupabaseAdmin()

    const { canonicalItems, expectedTotal } = await validatePricingAndStock({ supabaseAdmin, items })
    const quote = calculateShippingRate(expectedTotal, undefined, { address: customer.address })
    const manualReference = 'manual_' + crypto.randomUUID()
    const { data: saved, error: saveError } = await supabaseAdmin.rpc('complete_checkout', {
      p_order: {
        customer_name: customer.name, customer_email: customer.email,
        customer_phone: customer.phone, customer_address: customer.address,
        total_amount: quote.total, shipping_amount: quote.shippingAmount,
        payment_method: 'cod', razorpay_order_id: manualReference, razorpay_payment_id: manualReference,
      },
      p_items: canonicalItems,
    })
    if (saveError || !saved?.order_id) {
      throw new HttpError(409, 'Could not place the order. Please refresh your cart and try again.', 'ORDER_SAVE_RETRY_REQUIRED')
    }
    const order = { id: String(saved.order_id) }
    const confirmationToken = String(saved.confirmation_token)


    await writeAuditLog({
      actorType: 'customer',
      action: 'order.create_manual',
      entityType: 'order',
      entityId: order.id,
      requestId,
      metadata: {
        paymentMethod: 'cod',
        subtotalAmount: quote.subtotal,
        shippingAmount: quote.shippingAmount,
        totalAmount: quote.total,
        itemCount: canonicalItems.length,
      },
    })

    after(() => notifyOrderPlaced(order.id))

    return jsonOk({ order_id: order.id, confirmation_token: confirmationToken, payment_method: 'cod' }, { requestId })
  })
}
