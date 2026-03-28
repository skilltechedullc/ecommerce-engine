import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export class HttpError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, message: string, code: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

function requestIdFrom(req: Request): string {
  return req.headers.get('x-request-id')?.trim() || crypto.randomUUID()
}

type JsonBody = Record<string, unknown>

export function jsonOk(body: JsonBody, init?: { status?: number; requestId?: string }) {
  return NextResponse.json(
    {
      success: true,
      data: body,
      ...body,
      requestId: init?.requestId,
    },
    { status: init?.status ?? 200 }
  )
}

export function jsonError(
  message: string,
  init: { status: number; code: string; requestId: string; details?: unknown }
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: init.code,
      details: init.details,
      requestId: init.requestId,
    },
    { status: init.status }
  )
}

export async function parseJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, 'Invalid JSON body', 'INVALID_JSON')
  }
}

export function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${field} is required`, 'VALIDATION_ERROR')
  }
  return value.trim()
}

export function assertNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new HttpError(400, `${field} must be a valid number`, 'VALIDATION_ERROR')
  }
  return value
}

export function assertPositiveNumber(value: unknown, field: string): number {
  const parsed = assertNumber(value, field)
  if (parsed <= 0) {
    throw new HttpError(400, `${field} must be greater than 0`, 'VALIDATION_ERROR')
  }
  return parsed
}

export function assertNonNegativeNumber(value: unknown, field: string): number {
  const parsed = assertNumber(value, field)
  if (parsed < 0) {
    throw new HttpError(400, `${field} must be greater than or equal to 0`, 'VALIDATION_ERROR')
  }
  return parsed
}

export function assertArray<T>(value: unknown, field: string): T[] {
  if (!Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an array`, 'VALIDATION_ERROR')
  }
  return value as T[]
}

export async function withApiHandler(
  req: NextRequest,
  handler: (ctx: { requestId: string }) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = requestIdFrom(req)

  try {
    return await handler({ requestId })
  } catch (error) {
    if (error instanceof HttpError) {
      const safeDetails = error.status >= 500 ? undefined : error.details
      return jsonError(error.message, {
        status: error.status,
        code: error.code,
        details: safeDetails,
        requestId,
      })
    }

    return jsonError('Internal server error', {
      status: 500,
      code: 'INTERNAL_ERROR',
      requestId,
    })
  }
}
