import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { hasPermission } from '@/lib/server/permissions'
import { getProviderHealthChecks } from '@/lib/server/providerHealth'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'settings:read')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    return jsonOk({ checks: getProviderHealthChecks() }, { requestId })
  })
}
