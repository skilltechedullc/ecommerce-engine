import { headers } from 'next/headers'
import { HttpError } from '@/lib/server/api'

function getBaseUrl(h: Headers): string {
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (!host) return 'http://localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  return `${proto}://${host}`
}

export async function fetchInternalApi<T>(path: string): Promise<T> {
  const incomingHeaders = await headers()
  const cookie = incomingHeaders.get('cookie') ?? ''
  const baseUrl = getBaseUrl(incomingHeaders)
  const requestId = incomingHeaders.get('x-request-id')
  const outboundHeaders: Record<string, string> = { cookie }
  if (requestId) outboundHeaders['x-request-id'] = requestId

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: outboundHeaders,
    cache: 'no-store',
  })

  const json = (await res.json()) as {
    success?: boolean
    error?: string
    data?: T
  }

  if (!res.ok || !json.success) {
    throw new HttpError(res.status || 500, json.error ?? 'Internal API request failed', 'INTERNAL_API_ERROR')
  }

  if (json.data !== undefined) {
    return json.data
  }

  // Backward compatibility with routes returning flattened payloads.
  return json as T
}
