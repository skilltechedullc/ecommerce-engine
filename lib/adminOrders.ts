import { tenantConfig } from '@/lib/tenant.config'

export const STORE_TIME_ZONE = tenantConfig.region.countryCode === 'IN' ? 'Asia/Kolkata' : 'UTC'
export const STORE_TIME_LABEL = STORE_TIME_ZONE === 'Asia/Kolkata' ? 'IST' : 'UTC'
export function storeDateKey(value: string | Date): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {timeZone:STORE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}
export type OrderFilters = {scope?:string;status?:string;q?:string}
type FilterableOrder = {id:string;created_at:string|null;status:string|null;customer_name?:string|null;customer_email?:string|null;razorpay_payment_id?:string|null}
export function filterAdminOrders<T extends FilterableOrder>(orders:T[], filters:OrderFilters, now=new Date()):T[] {
 const query=(filters.q??'').trim().slice(0,200).toLowerCase()
 return orders.filter(order => (filters.scope!=='today'||Boolean(order.created_at&&storeDateKey(order.created_at)===storeDateKey(now))) && (!filters.status||(filters.status==='awaiting_dispatch'?['Paid','Processing'].includes(order.status??''):order.status===filters.status)) && (!query||[order.id,order.customer_name,order.customer_email,order.razorpay_payment_id].some(value=>value?.toLowerCase().includes(query))))
}
