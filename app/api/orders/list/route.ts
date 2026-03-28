import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'orders-list', windowMs: 60_000, maxRequests: 60 })

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'orders:list')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(product_name, quantity, price)')

    if (error) {
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    const orders = [...(data ?? [])].sort((a, b) => {
      const aTime = Date.parse(String(a.created_at ?? '')) || 0
      const bTime = Date.parse(String(b.created_at ?? '')) || 0
      return bTime - aTime
    })

    return jsonOk({ orders }, { requestId })
  })
}
