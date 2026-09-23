import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { hasPermission } from '@/lib/server/permissions'
import { bulkProductUpdateSchema, parseSchema } from '@/lib/server/schemas'
import { writeAuditLog } from '@/lib/server/audit'

function nextPrice(current: number, mode: string, value: number): number {
  if (mode === 'set') return value
  if (mode === 'increase_percent') return Math.round(current * (1 + value / 100) * 100) / 100
  if (mode === 'decrease_percent') return Math.max(0.01, Math.round(current * (1 - value / 100) * 100) / 100)
  return current
}

function nextStock(current: number, mode: string, value: number): number {
  if (mode === 'set') return value
  if (mode === 'increase') return current + value
  if (mode === 'decrease') return Math.max(0, current - value)
  return current
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'products-bulk-update', windowMs: 60_000, maxRequests: 20 })
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'catalog:bulk-update')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const input = parseSchema(bulkProductUpdateSchema, await parseJson<unknown>(req))
    const supabase = getSupabaseAdmin()
    const productPatch: Record<string, unknown> = {}

    if (input.patch.is_active !== undefined) productPatch.is_active = input.patch.is_active
    if (input.patch.category !== undefined) productPatch.category = input.patch.category || null
    if (input.patch.subcategory !== undefined) productPatch.subcategory = input.patch.subcategory || null
    if (input.patch.image !== undefined) productPatch.image = input.patch.image || null

    if (Object.keys(productPatch).length > 0) {
      const { error } = await supabase
        .from('products')
        .update(productPatch)
        .in('id', input.productIds)

      if (error) throw new HttpError(500, error.message, 'DB_UPDATE_PRODUCTS_FAILED')
    }

    const priceMode = input.patch.priceMode ?? 'none'
    const stockMode = input.patch.stockMode ?? 'none'
    const priceValue = input.patch.priceValue ?? 0
    const stockValue = input.patch.stockValue ?? 0

    if (priceMode !== 'none' || stockMode !== 'none') {
      const { data: variants, error: fetchError } = await supabase
        .from('product_variants')
        .select('id, price, stock')
        .in('product_id', input.productIds)

      if (fetchError) throw new HttpError(500, fetchError.message, 'DB_FETCH_VARIANTS_FAILED')

      for (const variant of variants ?? []) {
        const { error } = await supabase
          .from('product_variants')
          .update({
            price: nextPrice(Number(variant.price), priceMode, priceValue),
            stock: nextStock(Number(variant.stock), stockMode, stockValue),
          })
          .eq('id', variant.id)

        if (error) throw new HttpError(500, error.message, 'DB_UPDATE_VARIANTS_FAILED')
      }
    }

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: 'product.bulk_update',
      entityType: 'product',
      requestId,
      metadata: {
        productIds: input.productIds,
        patch: input.patch,
      },
    })

    return jsonOk({ updatedCount: input.productIds.length }, { requestId })
  })
}
