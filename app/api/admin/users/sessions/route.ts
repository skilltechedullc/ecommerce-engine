import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { hasPermission } from '@/lib/server/permissions'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'admin-user-sessions-read', windowMs: 60_000, maxRequests: 60 })
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'admin-users:manage')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const { data, error } = await getSupabaseAdmin()
      .from('admin_sessions')
      .select('id, session_label, ip_address, user_agent, revoked_at, created_at, expires_at, admin_users(email, role)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw new HttpError(500, error.message, 'DB_FETCH_ADMIN_SESSIONS_FAILED')
    return jsonOk({ sessions: data ?? [] }, { requestId })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)
    await enforceRateLimit(req, { keyPrefix: 'admin-session-revoke', windowMs: 60000, maxRequests: 20 })
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'admin-users:manage')) throw new HttpError(403, 'Unauthorized', 'UNAUTHORIZED')
    const body = await parseJson<{ session_id?: string }>(req)
    if (!body.session_id || !/^[0-9a-f-]{36}$/i.test(body.session_id)) throw new HttpError(400, 'Valid session ID is required', 'VALIDATION_ERROR')
    const { error } = await getSupabaseAdmin().from('admin_sessions')
      .update({ revoked_at: new Date().toISOString() }).eq('id', body.session_id)
    if (error) throw new HttpError(503, 'Could not revoke session', 'ADMIN_SESSION_REVOKE_FAILED')
    return jsonOk({ revoked: true }, { requestId })
  })
}
