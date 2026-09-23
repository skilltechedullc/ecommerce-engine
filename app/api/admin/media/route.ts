import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { hasPermission } from '@/lib/server/permissions'

const BUCKET = 'product-images'

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'admin-media-read', windowMs: 60_000, maxRequests: 60 })
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'media:manage')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const supabase = getSupabaseAdmin()
    const { data: storageFiles, error: storageError } = await supabase.storage.from(BUCKET).list('', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (storageError) throw new HttpError(500, storageError.message, 'STORAGE_LIST_FAILED')

    const assets = (storageFiles ?? [])
      .filter((file) => file.id !== null)
      .map((file) => {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(file.name)
        return {
          bucket: BUCKET,
          path: file.name,
          public_url: data.publicUrl,
          size_bytes: file.metadata?.size ?? null,
          content_type: file.metadata?.mimetype ?? null,
          created_at: file.created_at ?? null,
        }
      })

    return jsonOk({ assets }, { requestId })
  })
}
