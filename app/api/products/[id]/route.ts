import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'products-read', windowMs: 60_000, maxRequests: 60 })

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'products:read')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const { id } = await params
    if (!id) {
      throw new HttpError(400, 'Product ID is required', 'VALIDATION_ERROR')
    }

    const supabase = getSupabaseAdmin()
    const { data: product, error } = await supabase
      .from('products')
      .select('*, product_images(image_url, sort_order), product_variants(*, variant_images(image_url, sort_order))')
      .eq('id', id)
      .single()

    if (error || !product) {
      throw new HttpError(404, 'Product not found', 'NOT_FOUND')
    }

    return jsonOk({ data: { product } }, { requestId })
  })
}
