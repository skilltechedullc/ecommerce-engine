import crypto from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { env, isProduction, optionalEnv } from '@/lib/server/env'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

const ADMIN_COOKIE_NAME = 'admin-auth'
export const ADMIN_SESSION_HOURS = 8

function getSigningSecret(): string {
  const secret = optionalEnv('ADMIN_SESSION_SECRET')
  if (isProduction() && (!secret || secret.length < 32)) {
    throw new Error('ADMIN_SESSION_SECRET must contain at least 32 characters in production')
  }
  return secret ?? env('ADMIN_PASSWORD')
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')
}

export type AdminSessionPayload = {
  iat: number
  exp: number
  v: number
  adminUserId?: string
  sessionId?: string
  role?: string
}

export function createAdminSessionToken(input: { adminUserId?: string; sessionId?: string; role?: string } = {}): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: AdminSessionPayload = { iat: now, exp: now + ADMIN_SESSION_HOURS * 3600, v: 2, ...input }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return encoded + '.' + sign(encoded)
}

export function parseAdminSessionToken(token: string): AdminSessionPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [encoded, signature] = parts
  if (!encoded || !signature) return null
  const expected = Buffer.from(sign(encoded))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminSessionPayload
    const now = Math.floor(Date.now() / 1000)
    if (payload.v !== 2 || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)
      || payload.iat > now + 60 || payload.exp <= now || payload.exp - payload.iat > ADMIN_SESSION_HOURS * 3600) return null
    return payload
  } catch { return null }
}

export function isValidAdminSessionToken(token: string): boolean {
  return parseAdminSessionToken(token) !== null
}

export async function getAdminSessionPayload(): Promise<AdminSessionPayload | null> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value
  if (!token) return null
  const payload = parseAdminSessionToken(token)
  if (!payload) return null
  const authMode = optionalEnv('ADMIN_AUTH_MODE') ?? 'single_password'
  if (authMode === 'single_password') {
    return !payload.adminUserId && !payload.sessionId && payload.role === 'super_admin' ? payload : null
  }
  if (authMode !== 'database' || !payload.adminUserId || !payload.sessionId) return null
  const supabase = getSupabaseAdmin()
  const { data: session, error: sessionError } = await supabase.from('admin_sessions')
    .select('admin_user_id, revoked_at, expires_at').eq('id', payload.sessionId).maybeSingle()
  if (sessionError || !session || session.admin_user_id !== payload.adminUserId
    || session.revoked_at || !(Date.parse(session.expires_at) > Date.now())) return null
  const { data: user, error: userError } = await supabase.from('admin_users')
    .select('role, status, two_factor_enabled').eq('id', payload.adminUserId).maybeSingle()
  if (userError || !user || user.status !== 'active' || user.two_factor_enabled
    || !['owner', 'product_manager', 'order_manager', 'support', 'developer'].includes(user.role)) return null
  // Read the current role so disabling users or changing permissions takes effect immediately.
  return { ...payload, role: user.role }
}

export async function isAdminSessionAuthenticated(): Promise<boolean> {
  return (await getAdminSessionPayload()) !== null
}

export function setAdminSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true, secure: isProduction(), sameSite: 'lax', path: '/', maxAge: ADMIN_SESSION_HOURS * 3600,
  })
}

export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true, secure: isProduction(), sameSite: 'lax', path: '/', maxAge: 0,
  })
}
