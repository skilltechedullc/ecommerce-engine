import { NextRequest } from 'next/server'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { clearAdminSessionCookie, createAdminSessionToken, setAdminSessionCookie } from '@/lib/server/adminSession'
import { env, isProduction } from '@/lib/server/env'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { parseSchema, adminLoginSchema } from '@/lib/server/schemas'

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, {
      keyPrefix: 'admin-login',
      windowMs: 60 * 1000,
      maxRequests: 8,
    })

    const body = await parseJson<unknown>(req)
    const { password } = parseSchema(adminLoginSchema, body)
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

    const token = createAdminSessionToken()
    const res = jsonOk({ authenticated: true }, { requestId })
    setAdminSessionCookie(res, token)
    return res
  })
}

export async function DELETE(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    const res = jsonOk({ authenticated: false }, { requestId })
    clearAdminSessionCookie(res)
    return res
  })
}
