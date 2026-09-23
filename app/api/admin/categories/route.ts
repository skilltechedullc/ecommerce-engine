import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { hasPermission } from '@/lib/server/permissions'
import { categoryWriteSchema, parseSchema } from '@/lib/server/schemas'
import { writeAuditLog } from '@/lib/server/audit'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'admin-categories-read', windowMs: 60_000, maxRequests: 60 })
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'catalog:categories')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const supabase = getSupabaseAdmin()
    const { data: managed, error: managedError } = await supabase
      .from('product_categories')
      .select('*')
      .order('sort_order')
      .order('name')

    if (managedError) throw new HttpError(500, managedError.message, 'DB_FETCH_CATEGORIES_FAILED')

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('category, subcategory')

    if (productsError) throw new HttpError(500, productsError.message, 'DB_FETCH_PRODUCTS_FAILED')

    return jsonOk({ categories: managed ?? [], productCategoryHints: products ?? [] }, { requestId })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'admin-categories-write', windowMs: 60_000, maxRequests: 30 })
    enforceSameOriginMutation(req)
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'catalog:categories')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const input = parseSchema(categoryWriteSchema, await parseJson<unknown>(req))
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('product_categories')
      .upsert(input, { onConflict: 'id' })
      .select('*')
      .single()

    if (error) throw new HttpError(500, error.message, 'DB_UPSERT_CATEGORY_FAILED')

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: input.id ? 'category.update' : 'category.create',
      entityType: 'product_category',
      entityId: data.id,
      requestId,
      metadata: input,
    })

    return jsonOk({ category: data }, { requestId })
  })
}
