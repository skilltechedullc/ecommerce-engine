import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { ADMIN_SESSION_HOURS, getAdminSessionPayload, clearAdminSessionCookie, createAdminSessionToken, setAdminSessionCookie } from '@/lib/server/adminSession'
import { env, isProduction, optionalEnv } from '@/lib/server/env'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { parseSchema, adminLoginSchema } from '@/lib/server/schemas'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, expected] = storedHash.split(':')
  if (algorithm !== 'scrypt' || !salt || !expected) return false
  const actual = crypto.scryptSync(password, salt, 64).toString('base64url')
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

async function authenticateDatabaseAdmin(req: NextRequest, email: string, password: string) {
  const supabase = getSupabaseAdmin()
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, email, role, status, password_hash, two_factor_enabled')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (error) throw new HttpError(500, error.message, 'DB_FETCH_ADMIN_USER_FAILED')
  if (!adminUser || adminUser.status !== 'active' || !adminUser.password_hash) {
    throw new HttpError(401, 'Invalid credentials', 'UNAUTHORIZED')
  }

  if (!verifyPassword(password, String(adminUser.password_hash))) {
    throw new HttpError(401, 'Invalid credentials', 'UNAUTHORIZED')
  }

  if (adminUser.two_factor_enabled) throw new HttpError(403, 'Two-factor login is not available in this release', 'TWO_FACTOR_UNAVAILABLE')

  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminUser.id)

  const { data: session, error: sessionError } = await supabase
    .from('admin_sessions')
    .insert({
      admin_user_id: adminUser.id,
      session_label: 'Admin web login',
      expires_at: new Date(Date.now() + ADMIN_SESSION_HOURS * 3600000).toISOString(),
      ip_address: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    })
    .select('id')
    .single()
  if (sessionError || !session) {
    throw new HttpError(503, 'Could not create admin session', 'ADMIN_SESSION_CREATE_FAILED')
  }

  return {
    id: String(adminUser.id),
    sessionId: String(session.id),
    role: String(adminUser.role),
    twoFactorEnabled: Boolean(adminUser.two_factor_enabled),
  }
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)
    await enforceRateLimit(req, {
      keyPrefix: 'admin-login',
      windowMs: 60 * 1000,
      maxRequests: 8,
    })

    const body = await parseJson<unknown>(req)
    const { email, password } = parseSchema(adminLoginSchema, body)
    const authMode = optionalEnv('ADMIN_AUTH_MODE') ?? 'single_password'

    if (authMode === 'database') {
      if (!email) throw new HttpError(400, 'Email is required', 'VALIDATION_ERROR')
      const adminUser = await authenticateDatabaseAdmin(req, email, password)
      const token = createAdminSessionToken({ adminUserId: adminUser.id, sessionId: adminUser.sessionId, role: adminUser.role })
      const res = jsonOk({ authenticated: true, twoFactorEnabled: adminUser.twoFactorEnabled }, { requestId })
      setAdminSessionCookie(res, token)
      return res
    }

    if (authMode !== 'single_password') throw new HttpError(503, 'Admin authentication mode is invalid', 'CONFIG_ERROR')
    const configuredPassword = env('ADMIN_PASSWORD')

    if (configuredPassword.length < 12) {
      throw new HttpError(500, 'Admin credentials are not configured securely', 'CONFIG_ERROR')
    }

    if (isProduction() && /change|default|password/i.test(configuredPassword)) {
      throw new HttpError(500, 'Admin credentials are not configured securely', 'CONFIG_ERROR')
    }

    if (password !== configuredPassword) {
      throw new HttpError(401, 'Invalid password', 'UNAUTHORIZED')
    }

    const token = createAdminSessionToken({ role: 'super_admin' })
    const res = jsonOk({ authenticated: true }, { requestId })
    setAdminSessionCookie(res, token)
    return res
  })
}

export async function DELETE(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)
    const session = await getAdminSessionPayload()
    if (session?.sessionId) {
      const { error } = await getSupabaseAdmin().from('admin_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', session.sessionId)
      if (error) throw new HttpError(503, 'Could not revoke session', 'ADMIN_SESSION_REVOKE_FAILED')
    }
    const res = jsonOk({ authenticated: false }, { requestId })
    clearAdminSessionCookie(res)
    return res
  })
}
