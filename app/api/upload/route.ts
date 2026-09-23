import { NextRequest } from 'next/server'
import crypto from 'crypto'
import sharp from 'sharp'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { getAdminRole } from '@/lib/adminAuth'
import { hasPermission } from '@/lib/server/permissions'
import { HttpError, jsonOk, withApiHandler } from '@/lib/server/api'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { assertAllowedImageSignature, assertImageDimensions } from '@/lib/server/fileValidation'

const BUCKET = 'product-images'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_IMAGE_WIDTH = 6000
const MAX_IMAGE_HEIGHT = 6000
const MAX_IMAGE_PIXELS = 24_000_000
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

async function sanitizeImage(bytes: Uint8Array, contentType: string): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
  if (contentType === 'image/jpeg') {
    return {
      buffer: await sharp(bytes).rotate().jpeg({ quality: 86, mozjpeg: true }).toBuffer(),
      contentType,
      ext: 'jpg',
    }
  }

  if (contentType === 'image/png') {
    return {
      buffer: await sharp(bytes).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer(),
      contentType,
      ext: 'png',
    }
  }

  if (contentType === 'image/webp') {
    return {
      buffer: await sharp(bytes).webp({ quality: 86 }).toBuffer(),
      contentType,
      ext: 'webp',
    }
  }

  return { buffer: Buffer.from(bytes), contentType, ext: 'gif' }
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    await enforceRateLimit(req, { keyPrefix: 'upload', windowMs: 60_000, maxRequests: 20 })
    enforceSameOriginMutation(req)

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

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    assertAllowedImageSignature(bytes, file.type)
    assertImageDimensions(bytes, file.type, {
      maxWidth: MAX_IMAGE_WIDTH,
      maxHeight: MAX_IMAGE_HEIGHT,
      maxPixels: MAX_IMAGE_PIXELS,
    })
    const sanitized = await sanitizeImage(bytes, file.type)
    const filename = `${crypto.randomUUID()}.${sanitized.ext}`

    const supabase = getSupabaseAdmin()

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, sanitized.buffer, {
        contentType: sanitized.contentType,
        upsert: false,
      })

    if (error) {
      throw new HttpError(500, error.message, 'UPLOAD_FAILED')
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(filename)

    const { error: mediaError } = await supabase.from('media_assets').upsert({
      bucket: BUCKET,
      path: filename,
      public_url: publicData.publicUrl,
      content_type: sanitized.contentType,
      size_bytes: sanitized.buffer.byteLength,
      usage_scope: 'product',
    }, { onConflict: 'bucket,path' })
    if (mediaError) {
      console.warn('[upload] failed to register media asset', mediaError.message)
    }

    return jsonOk({ url: publicData.publicUrl }, { requestId })
  })
}
