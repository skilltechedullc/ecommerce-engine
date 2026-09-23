import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { hasPermission } from '@/lib/server/permissions'
import { writeAuditLog } from '@/lib/server/audit'

type TemplatePayload = {
  id?: string
  template_key?: string
  channel?: string
  subject?: string | null
  body?: string
  variables?: string[]
  is_active?: boolean
}

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'settings:read')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const { data, error } = await getSupabaseAdmin()
      .from('notification_templates')
      .select('*')
      .order('template_key', { ascending: true })

    if (error) {
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    return jsonOk({ templates: data ?? [] }, { requestId })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'settings:update')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const body = await parseJson<TemplatePayload>(req)
    const templateKey = body.template_key?.trim()
    const channel = body.channel?.trim()
    const templateBody = body.body?.trim()

    if (!templateKey || !channel || !templateBody) {
      throw new HttpError(400, 'template_key, channel, and body are required', 'VALIDATION_ERROR')
    }

    const payload = {
      template_key: templateKey,
      channel,
      subject: body.subject?.trim() || null,
      body: templateBody,
      variables: body.variables ?? [],
      is_active: body.is_active ?? true,
    }

    const { data, error } = await getSupabaseAdmin()
      .from('notification_templates')
      .upsert(payload, { onConflict: 'template_key' })
      .select('*')
      .single()

    if (error) {
      throw new HttpError(500, error.message, 'DB_UPSERT_FAILED')
    }

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: 'notification_template.upsert',
      entityType: 'notification_template',
      entityId: String(data.id),
      requestId,
      metadata: { templateKey, channel },
    })

    return jsonOk({ template: data }, { requestId })
  })
}
