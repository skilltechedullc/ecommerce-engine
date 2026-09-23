import { NextRequest } from 'next/server'
import { HttpError } from '@/lib/server/api'

function requestOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || req.headers.get('host')?.trim()
  return host ? `${proto}://${host}` : req.nextUrl.origin
}

export function enforceSameOriginMutation(req: NextRequest): void {
  const expectedOrigin = requestOrigin(req)
  const origin = req.headers.get('origin')?.trim()
  const referer = req.headers.get('referer')?.trim()
  const secFetchSite = req.headers.get('sec-fetch-site')?.trim()

  if (origin) {
    if (origin !== expectedOrigin) {
      throw new HttpError(403, 'Cross-site admin request blocked', 'CSRF_BLOCKED')
    }
    return
  }

  if (referer) {
    try {
      if (new URL(referer).origin !== expectedOrigin) {
        throw new HttpError(403, 'Cross-site admin request blocked', 'CSRF_BLOCKED')
      }
      return
    } catch {
      throw new HttpError(403, 'Invalid request origin', 'CSRF_BLOCKED')
    }
  }

  if (secFetchSite !== 'same-origin') {
    throw new HttpError(403, 'Cross-site admin request blocked', 'CSRF_BLOCKED')
  }
}
