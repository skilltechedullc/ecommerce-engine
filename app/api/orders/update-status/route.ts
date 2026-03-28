import { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { parseSchema, orderStatusSchema } from '@/lib/server/schemas'
import { ORDER_STATUS_PROGRESSION, type OrderStatus } from '@/lib/orderStatus'

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'orders:update-status')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const body = await parseJson<unknown>(req)
    const { orderId, newStatus } = parseSchema(orderStatusSchema, body)

    const supabase = getSupabaseAdmin()
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      throw new HttpError(404, 'Order not found', 'ORDER_NOT_FOUND')
    }

    const currentStatus = order.status as OrderStatus
    const allowedNextStatuses = ORDER_STATUS_PROGRESSION[currentStatus] || []

    if (!allowedNextStatuses.includes(newStatus)) {
      if (currentStatus === newStatus) {
        throw new HttpError(400, `Order status is already ${currentStatus}`, 'STATUS_UNCHANGED')
      }

      throw new HttpError(
        400,
        `Cannot change status from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedNextStatuses.join(', ') || 'none (final state)'}`,
        'INVALID_STATUS_TRANSITION'
      )
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (error) {
      throw new HttpError(500, error.message, 'DB_UPDATE_FAILED')
    }

    return jsonOk({ orderId, status: newStatus }, { requestId })
  })
}
