import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { hasPermission } from '@/lib/server/permissions'
import { writeAuditLog } from '@/lib/server/audit'
import { tenantConfig } from '@/lib/tenant.config'

type StoreSettingsPayload = {
  draft?: unknown
  publish?: unknown
}

const DEFAULT_SETTINGS_ID = 'default'

function defaultDraft() {
  return {
    branding: tenantConfig.branding,
    contact: tenantConfig.contact,
    legal: tenantConfig.legal,
    region: tenantConfig.region,
    features: tenantConfig.features,
    shipping: tenantConfig.shipping,
  }
}

function assertRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'draft must be an object', 'VALIDATION_ERROR')
  }

  return value as Record<string, unknown>
}

export async function GET(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'settings:read')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('store_settings')
      .select('id, draft, published, updated_at, published_at')
      .eq('id', DEFAULT_SETTINGS_ID)
      .maybeSingle()

    if (error) {
      throw new HttpError(500, error.message, 'DB_FETCH_FAILED')
    }

    return jsonOk({
      settings: data ?? {
        id: DEFAULT_SETTINGS_ID,
        draft: defaultDraft(),
        published: {},
        updated_at: null,
        published_at: null,
      },
    }, { requestId })
  })
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({ requestId }) => {
    enforceSameOriginMutation(req)

    const role = await getAdminRole()
    if (!role || !hasPermission(role, 'settings:update')) {
      throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED')
    }

    const body = await parseJson<StoreSettingsPayload>(req)
    const draft = assertRecord(body.draft)
    const publish = body.publish === true
    const payload: Record<string, unknown> = publish
      ? { id: DEFAULT_SETTINGS_ID, draft, published: draft, published_at: new Date().toISOString() }
      : { id: DEFAULT_SETTINGS_ID, draft }

    const { data, error } = await getSupabaseAdmin()
      .from('store_settings')
      .upsert(payload, { onConflict: 'id' })
      .select('id, draft, published, updated_at, published_at')
      .single()

    if (error) {
      throw new HttpError(500, error.message, 'DB_UPDATE_FAILED')
    }

    await writeAuditLog({
      actorType: 'admin',
      actorId: role,
      action: publish ? 'store_settings.publish' : 'store_settings.draft_update',
      entityType: 'store_settings',
      entityId: DEFAULT_SETTINGS_ID,
      requestId,
      metadata: {
        changedKeys: Object.keys(draft),
      },
    })

    return jsonOk({ settings: data }, { requestId })
  })
}
