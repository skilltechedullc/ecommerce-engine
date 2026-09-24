import { NextRequest } from 'next/server'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { importedCartSchema } from '@/lib/whatsapp/importCart'
export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'cart-import', windowMs: 60000, maxRequests: 20 })
    const parsed = importedCartSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) throw new HttpError(400, 'This cart link is invalid. Please request a new one.', 'INVALID_CART')
    const { data, error } = await getSupabaseAdmin().from('product_variants')
      .select('id, product_id, weight, price, stock, products!inner(name, is_active)')
      .in('id', parsed.data.map(item => item.variant_id))
    if (error) throw new HttpError(503, 'Unable to load cart. Please try again.', 'CART_UNAVAILABLE')
    const rows = new Map((data ?? []).map(row => [row.id, row]))
    const items = parsed.data.map(item => {
      const row = rows.get(item.variant_id)
      const product = row && (Array.isArray(row.products) ? row.products[0] : row.products)
      if (!row || !product?.is_active || Number(row.stock) < item.quantity || Number(row.price) <= 0) {
        throw new HttpError(409, 'An item is unavailable or has insufficient stock. Please return to the shop to review your selection.', 'CART_CHANGED')
      }
      return { id: row.id, variant_id: row.id, product_id: row.product_id, variant_name: row.weight || 'Default',
        name: product.name, price: Number(row.price), quantity: item.quantity }
    })
    return jsonOk({ items }, { requestId })
  })
}
