import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { retryFailedOrderNotifications } from '@/lib/server/notifications'
import { enforceSameOriginMutation } from '@/lib/server/csrf'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'orders:update-status')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const { id } = await params
    if (!id || typeof id !== 'string') {
      throw new HttpError(400, 'Order ID is required', 'VALIDATION_ERROR')
    }

    const summary = await retryFailedOrderNotifications(id)
    return jsonOk(summary, { requestId })
  })
}
