import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { hasPermission } from '@/lib/server/permissions'
import { adminUserWriteSchema, parseSchema } from '@/lib/server/schemas'
import { writeAuditLog } from '@/lib/server/audit'

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('base64url')
  const hash = crypto.scryptSync(password, salt, 64).toString('base64url')
  return `scrypt:${salt}:${hash}`
}

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'admin-users-read', windowMs: 60_000, maxRequests: 60 })
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'admin-users:manage')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const { data, error } = await getSupabaseAdmin()
      .from('admin_users')
      .select('id, email, name, role, status, two_factor_enabled, invited_at, last_login_at, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new HttpError(500, error.message, 'DB_FETCH_ADMIN_USERS_FAILED')
    return jsonOk({ users: data ?? [] }, { requestId })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'admin-users-write', windowMs: 60_000, maxRequests: 20 })
    enforceSameOriginMutation(req)
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'admin-users:manage')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const input = parseSchema(adminUserWriteSchema, await parseJson<unknown>(req))
    const payload: Record<string, unknown> = {
      email: input.email.toLowerCase(),
      name: input.name ?? null,
      role: input.role,
      status: input.status,
      two_factor_enabled: input.two_factor_enabled,
    }
    if (input.id) payload.id = input.id
    if (input.temporary_password) {
      payload.password_hash = hashPassword(input.temporary_password)
      payload.status = 'active'
    }

    const { data, error } = await getSupabaseAdmin()
      .from('admin_users')
      .upsert(payload, { onConflict: input.id ? 'id' : 'email' })
      .select('id, email, name, role, status, two_factor_enabled')
      .single()

    if (error) throw new HttpError(500, error.message, 'DB_UPSERT_ADMIN_USER_FAILED')

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: input.id ? 'admin_user.update' : 'admin_user.invite',
      entityType: 'admin_user',
      entityId: data.id,
      requestId,
      metadata: { email: input.email, role: input.role, status: input.status },
    })

    return jsonOk({ user: data }, { requestId })
  })
}
