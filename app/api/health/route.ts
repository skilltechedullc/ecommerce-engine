import { NextRequest } from 'next/server'
import { jsonOk, withApiHandler } from '@/lib/server/api'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    return jsonOk(
      {
        status: 'ok',
        service: 'commerce-engine',
        timestamp: new Date().toISOString(),
      },
      { requestId }
    )
  })
}
