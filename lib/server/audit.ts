import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { logger } from '@/lib/server/logger'

export type AuditActorType = 'admin' | 'customer' | 'system' | 'webhook'

export type AuditLogInput = {
  actorType: AuditActorType
  actorId?: string
  action: string
  entityType: string
  entityId?: string
  requestId?: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      actor_type: input.actorType,
      actor_id: input.actorId ?? null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      request_id: input.requestId ?? null,
      metadata: input.metadata ?? {},
    })

  if (error) {
    logger.error('audit.write_failed', {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      requestId: input.requestId,
      error: error.message,
    })
  }
}
