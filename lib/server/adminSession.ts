import crypto from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { env, isProduction, optionalEnv } from '@/lib/server/env'

const ADMIN_COOKIE_NAME = 'admin-auth'
const DEFAULT_SESSION_HOURS = 8

function getSigningSecret(): string {
  return optionalEnv('ADMIN_SESSION_SECRET') ?? env('ADMIN_PASSWORD')
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function createAdminSessionToken(hours = DEFAULT_SESSION_HOURS): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = JSON.stringify({ iat: now, exp: now + hours * 60 * 60, v: 1 })
  const encodedPayload = Buffer.from(payload, 'utf8').toString('base64url')
  const signature = sign(encodedPayload)
  return `${encodedPayload}.${signature}`
}

export function isValidAdminSessionToken(token: string): boolean {
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return false

  const expectedSig = sign(encodedPayload)
  if (!timingSafeEqual(signature, expectedSig)) return false

  try {
    const parsed = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as {
      exp?: number
    }

    if (typeof parsed.exp !== 'number') return false
    const now = Math.floor(Date.now() / 1000)
    return parsed.exp > now
  } catch {
    return false
  }
}

export async function isAdminSessionAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value
  if (!value) return false

  return isValidAdminSessionToken(value)
}

export function setAdminSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: DEFAULT_SESSION_HOURS * 60 * 60,
  })
}

export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
