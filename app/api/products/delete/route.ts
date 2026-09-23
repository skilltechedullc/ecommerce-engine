import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { parseSchema, deleteProductSchema } from '@/lib/server/schemas'
import { writeAuditLog } from '@/lib/server/audit'

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'products-delete', windowMs: 60_000, maxRequests: 20 })
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'products:delete')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const body = await parseJson<unknown>(req)
    const { id } = parseSchema(deleteProductSchema, body)

    const supabase = getSupabaseAdmin()

    const { error: deleteVariantsError } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', id)

    if (deleteVariantsError) {
      throw new HttpError(500, deleteVariantsError.message, 'DB_DELETE_VARIANTS_FAILED')
    }

    const { error: deleteProductError } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (deleteProductError) {
      throw new HttpError(500, deleteProductError.message, 'DB_DELETE_PRODUCT_FAILED')
    }

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: 'product.delete',
      entityType: 'product',
      entityId: id,
      requestId,
    })

    return jsonOk({}, { requestId })
  })
}
