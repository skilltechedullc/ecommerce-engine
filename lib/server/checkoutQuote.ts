import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, assertArray, assertPositiveNumber, assertString } from '@/lib/server/api'
import { aggregateCheckoutItems } from '@/lib/server/checkoutHardening'
import { calculateShippingRate } from '@/lib/shipping/rates'
import { couponDiscount, normalizeCouponCode, type Coupon } from '@/lib/coupons'
type ParsedOrderItem = {
  variant_id: string
  quantity: number
}

type CanonicalCheckoutItem = {
  variant_id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
}

function parseItems(value: unknown): ParsedOrderItem[] {
  const items = assertArray<{ variant_id?: string; quantity?: number }>(value, 'items')
  if (items.length === 0) {
    throw new HttpError(400, 'items must include at least one item', 'VALIDATION_ERROR')
  }

  const parsedItems = items.map((item, index) => {
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

  return aggregateCheckoutItems(parsedItems)
}


export async function checkoutQuote(rawItems: unknown, rawCode: unknown, address = '') {
  const items = parseItems(rawItems)
  if (items.length > 100) throw new HttpError(400, 'Too many cart items', 'INVALID_CART')
  const supabaseAdmin = getSupabaseAdmin()
    const variantIds = items.map((item) => item.variant_id)

    const { data: variants, error: variantsError } = await supabaseAdmin
      .from('product_variants')
      .select('id, product_id, weight, price, stock')
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
      .select('id, name, is_active')
      .in('id', productIds)

    if (productsError) {
      throw new HttpError(500, productsError.message, 'DB_FETCH_FAILED')
    }

    const productById = new Map((products ?? []).map((product) => [String(product.id), product]))

    let amount = 0
    const canonicalItems: CanonicalCheckoutItem[] = []
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
      canonicalItems.push({
        variant_id: item.variant_id,
        product_id: String(dbVariant.product_id),
        product_name: String(dbProduct.name) + (dbVariant.weight ? ' - ' + String(dbVariant.weight) : ''),
        price: dbPrice,
        quantity: item.quantity,
      })
    }


  let code: string
  try { code = normalizeCouponCode(rawCode) } catch (e) { throw new HttpError(400, (e as Error).message, 'INVALID_COUPON') }
  let coupon: Coupon | null = null
  let discount = 0
  if (code) {
    const { data, error } = await supabaseAdmin.from('coupons').select('*').eq('code', code).maybeSingle()
    if (error) throw new HttpError(503, 'Coupons are temporarily unavailable. Please try again.', 'COUPON_UNAVAILABLE')
    if (!data) throw new HttpError(400, 'Coupon code not found', 'INVALID_COUPON')
    coupon = data as Coupon
    const { count, error: countError } = await supabaseAdmin.from('checkout_sessions').select('id', { count: 'exact', head: true }).eq('coupon_id', coupon.id)
    if (countError) throw new HttpError(503, 'Unable to check coupon availability', 'COUPON_UNAVAILABLE')
    try { discount = couponDiscount(coupon, amount, count ?? 0) } catch (e) { throw new HttpError(400, (e as Error).message, 'INVALID_COUPON') }
  }
  const shipping = calculateShippingRate(Math.round((amount - discount) * 100) / 100, undefined, { address })
  return { items: canonicalItems, coupon, subtotal: Math.round(amount * 100) / 100, discount, shippingAmount: shipping.shippingAmount, total: shipping.total }
}
