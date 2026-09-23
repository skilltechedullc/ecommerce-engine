import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { hasPermission } from '@/lib/server/permissions'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'admin-inventory-read', windowMs: 60_000, maxRequests: 60 })
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'inventory:read')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const limit = Math.min(200, Number(req.nextUrl.searchParams.get('limit') ?? 100))
    const { data, error } = await getSupabaseAdmin()
      .from('inventory_events')
      .select('*, products(name, slug), product_variants(weight, sku)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw new HttpError(500, error.message, 'DB_FETCH_INVENTORY_FAILED')
    return jsonOk({ events: data ?? [] }, { requestId })
  })
}
