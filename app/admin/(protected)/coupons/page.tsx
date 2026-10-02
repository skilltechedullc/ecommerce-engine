import { requireAdminPermission } from '@/lib/adminAuth'
import { fetchInternalApi } from '@/lib/server/internalApi'
import type { Coupon } from '@/lib/coupons'
import CouponsClient from './CouponsClient'
export default async function CouponsPage() {
 await requireAdminPermission('coupons:manage')
 const data = await fetchInternalApi<{ coupons: Coupon[] }>('/api/admin/coupons')
 return <CouponsClient coupons={data.coupons} />
}
