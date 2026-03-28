import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'

const BUCKET = 'product-images'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'upload', windowMs: 60_000, maxRequests: 20 })

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'upload:image')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      throw new HttpError(400, 'Expected multipart/form-data', 'INVALID_REQUEST')
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      throw new HttpError(400, 'Missing file field in form data', 'VALIDATION_ERROR')
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new HttpError(
        400,
        `Unsupported file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        'VALIDATION_ERROR'
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new HttpError(400, 'File exceeds 5 MB limit', 'FILE_TOO_LARGE')
    }

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const filename = `${crypto.randomUUID()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const supabase = getSupabaseAdmin()

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      throw new HttpError(500, error.message, 'UPLOAD_FAILED')
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(filename)

    return jsonOk({ url: publicData.publicUrl }, { requestId })
  })
}
