import { createHash } from 'node:crypto'
import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { hasPermission } from '@/lib/server/permissions'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { parseSchema } from '@/lib/server/schemas'
import { manualTrackingSchema } from '@/lib/shipping/manualTracking'
import { writeAuditLog } from '@/lib/server/audit'

export async function POST(req: NextRequest) {
  return withApiHandler(req, async ({requestId}) => {
    enforceSameOriginMutation(req)
    await enforceRateLimit(req, { keyPrefix:'manual-tracking',windowMs:60_000,maxRequests:30 })
    const role = await getAdminRole()
    if (!role || !hasPermission(role,'orders:update-status')) throw new HttpError(403,'Not permitted','FORBIDDEN')
    const body = parseSchema(manualTrackingSchema, await parseJson<unknown>(req))
    const db = getSupabaseAdmin()
    const {data:order,error:oe} = await db.from('orders').select('id').eq('id',body.orderId).maybeSingle()
    if (oe) throw new HttpError(500,'Could not load order','DB_FETCH_FAILED')
    if (!order) throw new HttpError(404,'Order not found','ORDER_NOT_FOUND')
    const {data:existing,error:se} = await db.from('shipments').select('id,provider').eq('order_id',body.orderId).order('created_at',{ascending:false}).limit(1).maybeSingle()
    if (se) throw new HttpError(500,'Could not load tracking','DB_FETCH_FAILED')
    if (existing && existing.provider !== 'manual') throw new HttpError(409,'This shipment is managed by its courier integration','PROVIDER_MANAGED')
    // Stable per-order identity makes repeated creation requests update the same manual row.
    const hash = createHash('sha256').update('millco-manual-shipment:'+body.orderId).digest('hex')
    const id = existing?.id ?? `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`
    const {error} = await db.from('shipments').upsert({id,order_id:body.orderId,provider:'manual',awb_number:body.awb,tracking_url:body.trackingUrl||null,status:body.status}, {onConflict:'id'})
    if (error) throw new HttpError(500,'Could not save tracking','DB_SAVE_FAILED')
    await writeAuditLog({actorType:'admin',actorId:role,action:'shipment.tracking.update',entityType:'shipment',entityId:id,requestId})
    return jsonOk({saved:true},{requestId})
  })
}