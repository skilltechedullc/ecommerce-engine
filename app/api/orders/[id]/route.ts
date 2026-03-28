import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(req, async ({ requestId }) => {
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'orders:read')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const { id } = await params
    if (!id || typeof id !== 'string') {
      throw new HttpError(400, 'Order ID is required', 'VALIDATION_ERROR')
    }

    const supabase = getSupabaseAdmin()
    const [{ data: order, error: orderError }, { data: items, error: itemsError }] =
      await Promise.all([
        supabase.from('orders').select('*').eq('id', id).single(),
        supabase.from('order_items').select('*').eq('order_id', id),
      ])

    if (orderError || !order) {
      throw new HttpError(404, 'Order not found', 'NOT_FOUND')
    }

    if (itemsError) {
      throw new HttpError(500, itemsError.message, 'DB_FETCH_FAILED')
    }

    return jsonOk({ order, items: items ?? [] }, { requestId })
  })
}
