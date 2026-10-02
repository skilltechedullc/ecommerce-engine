import { NextRequest } from 'next/server'
import { getAdminRole } from '@/lib/adminAuth'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { HttpError, jsonOk, parseJson, withApiHandler } from '@/lib/server/api'
import { enforceSameOriginMutation } from '@/lib/server/csrf'
import { enforceRateLimit } from '@/lib/server/rateLimit'
import { hasPermission } from '@/lib/server/permissions'
import { parseSchema } from '@/lib/server/schemas'
import { couponWriteSchema } from '@/lib/coupons'
import { writeAuditLog } from '@/lib/server/audit'
async function authorize(req: NextRequest) {
  await enforceRateLimit(req, { keyPrefix: 'admin-coupons', windowMs: 60000, maxRequests: 60 })
  const role = await getAdminRole()
  if (!role || !hasPermission(role, 'coupons:manage')) throw new HttpError(403, 'Unauthorized', 'UNAUTHORIZED')
  return role
}
export async function GET(req: NextRequest) {
 return withApiHandler(req, async ({ requestId }) => {
  await authorize(req)
  const db = getSupabaseAdmin()
  const { data, error } = await db.from('coupons').select('*').order('created_at', { ascending: false })
  if (error) throw new HttpError(500, 'Could not load coupons', 'DB_FETCH_FAILED')
  const coupons = await Promise.all((data ?? []).map(async c => {
    const [all, used] = await Promise.all([
      db.from('checkout_sessions').select('id', { count: 'exact', head: true }).eq('coupon_id', c.id),
      db.from('checkout_sessions').select('id', { count: 'exact', head: true }).eq('coupon_id', c.id).eq('status','order_saved'),
    ])
    if (all.error || used.error) throw new HttpError(500, 'Could not load coupon usage', 'DB_FETCH_FAILED')
    return { ...c, used: used.count ?? 0, reserved: (all.count ?? 0) - (used.count ?? 0) }
  }))
  return jsonOk({ coupons }, { requestId })
 })
}
export async function POST(req: NextRequest) {
 return withApiHandler(req, async ({ requestId }) => {
  enforceSameOriginMutation(req)
  const role = await authorize(req)
  const input = parseSchema(couponWriteSchema, await parseJson<unknown>(req))
  const db = getSupabaseAdmin()
  const query = input.id ? db.from('coupons').update(input).eq('id',input.id) : db.from('coupons').insert(input)
  const { data, error } = await query.select('*').single()
  if (error) throw new HttpError(400, error.code === '23505' ? 'This coupon code already exists' : 'Could not save this coupon', 'COUPON_SAVE_FAILED')
  await writeAuditLog({ actorType: 'admin', actorId: role, action: input.id ? 'coupon.update' : 'coupon.create', entityType: 'coupon', entityId: data.id, requestId, metadata: input })
  return jsonOk({ coupon: data }, { requestId })
 })
}
