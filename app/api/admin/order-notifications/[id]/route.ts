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
    const { data, error } = await supabase
      .from('notification_logs')
      .select('id, event, channel, status, recipient, provider, provider_message_id, attempt_count, last_error, next_retry_at, created_at, updated_at')
      .eq('order_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.message.includes('notification_logs')) {
        throw new HttpError(
          500,
          'Notification logs table is missing. Apply the latest Supabase migration.',
          'DB_SCHEMA_OUTDATED'
        )
      }
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    return jsonOk({ logs: data ?? [] }, { requestId })
  })
}
