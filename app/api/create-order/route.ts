import Razorpay from 'razorpay'
import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { storeConfig } from '@/lib/config'
import { HttpError, assertArray, assertPositiveNumber, assertString, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { env } from '@/lib/server/env'
import { enforceRateLimit } from '@/lib/server/rateLimit'

const razorpay = new Razorpay({
  key_id: env('RAZORPAY_KEY_ID'),
  key_secret: env('RAZORPAY_KEY_SECRET'),
})

type CreateOrderBody = {
  items?: Array<{
    variant_id?: string
    quantity?: number
  }>
}

function parseItems(value: unknown) {
  const items = assertArray<{ variant_id?: string; quantity?: number }>(value, 'items')
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
    }
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, {
      keyPrefix: 'create-order',
      windowMs: 60 * 1000,
      maxRequests: 30,
    })

    const body = await parseJson<CreateOrderBody>(req)
    const items = parseItems(body.items)

    const supabaseAdmin = getSupabaseAdmin()
    const variantIds = Array.from(new Set(items.map((item) => item.variant_id)))

    const { data: variants, error: variantsError } = await supabaseAdmin
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
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, is_active')
      .in('id', productIds)

    if (productsError) {
      throw new HttpError(500, productsError.message, 'DB_FETCH_FAILED')
    }

    const productById = new Map((products ?? []).map((product) => [String(product.id), product]))

    let amount = 0
    for (const [index, item] of items.entries()) {
      const dbVariant = variantById.get(item.variant_id)
      if (!dbVariant) {
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
        throw new HttpError(
          400,
          `items[${index}] exceeds available stock (${dbStock})`,
          'INSUFFICIENT_STOCK'
        )
      }

      amount += dbPrice * item.quantity
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(400, 'Order total is invalid', 'VALIDATION_ERROR')
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // rupees → paise
      currency: storeConfig.currency,
      receipt: `receipt_${Date.now()}`,
    })

    return jsonOk({ order_id: order.id, amount: order.amount }, { requestId })
  })
}
