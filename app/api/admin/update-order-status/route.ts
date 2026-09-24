import { after, NextRequest } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { notifyOrderStatusChanged } from '@/lib/server/notifications'
import { ORDER_STATUS_PROGRESSION, type OrderStatus } from '@/lib/orderStatus'
import {
  HttpError,
  jsonOk,
  parseJson,
  withApiHandler,
} from '@/lib/server/api'
import { parseSchema, orderStatusSchema } from '@/lib/server/schemas'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { writeAuditLog } from '@/lib/server/audit'

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'orders:update-status')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const body = await parseJson<unknown>(req)
    const { orderId, newStatus, reason } = parseSchema(orderStatusSchema, body)

    // Fetch current order to validate status transition
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

    // Validate status transition
    if (!allowedNextStatuses.includes(newStatus)) {
      if (currentStatus === newStatus) {
        throw new HttpError(
          400,
          `Order status is already ${currentStatus}`,
          'STATUS_UNCHANGED'
        )
      }
      throw new HttpError(
        400,
        `Cannot change status from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedNextStatuses.join(', ') || 'none (final state)'}`,
        'INVALID_STATUS_TRANSITION'
      )
    }
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .eq('status', currentStatus)
      .select('id')
      .maybeSingle()

    if (error) {
      if (error.message.includes('updated_at')) {
        throw new HttpError(
          500,
          'Orders table is missing the updated_at column. Apply the latest Supabase migration before updating order status.',
          'DB_SCHEMA_OUTDATED'
        )
      }
      throw new HttpError(500, error.message, 'DB_UPDATE_FAILED')
    }

    if (!updated) throw new HttpError(409, 'Order status changed. Refresh and try again.', 'STATUS_CONFLICT')
    after(() => notifyOrderStatusChanged({ orderId, newStatus }))

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: 'order.status_update',
      entityType: 'order',
      entityId: orderId,
      requestId,
      metadata: {
        previousStatus: currentStatus,
        newStatus,
        reason: reason || undefined,
      },
    })

    return jsonOk({ status: newStatus }, { requestId })
  })
}
