import { requireAdminPermission } from '@/lib/adminAuth'
import Link from 'next/link'
import { moneyWithSymbol } from '@/lib/money'
import { fetchInternalApi } from '@/lib/server/internalApi'
import { tenantConfig } from '@/lib/tenant.config'


export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; status?: string }>
}) {
  await requireAdminPermission('orders:list')
  const { scope, status } = await searchParams
  const { orders } = await fetchInternalApi<{
    orders: Array<{
      id: string
      customer_name: string | null
      customer_email: string | null
      total_amount: number | null
      payment_method?: string | null
      razorpay_payment_id?: string | null
      created_at: string | null
      status: string | null
    }>
  }>('/api/orders/list')

  const safeOrders = orders ?? []
  const todayStr = new Date().toISOString().slice(0, 10)
  const filteredOrders = safeOrders.filter((order) => {
    const matchesScope = scope !== 'today' || order.created_at?.startsWith(todayStr)
    const matchesStatus = !status || order.status === status
    return matchesScope && matchesStatus
  })
  const pendingCount = filteredOrders.filter((order) => order.status === 'Pending').length
  const deliveredCount = filteredOrders.filter((order) => order.status === 'Delivered').length
  const revenue = filteredOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0)
  const hasFilter = scope === 'today' || Boolean(status)
  const heading = scope === 'today' ? 'Today Orders' : 'Orders'
  const description = scope === 'today'
    ? 'Orders placed since midnight, ready for quick review and action.'
    : 'Every order across the store, with payment and fulfillment visibility.'

  return (
    <div className="admin-stack">
      <section className="admin-surface admin-pageLead">
        <div>
          <p className="admin-sectionEyebrow">Operations</p>
          <h2 className="admin-sectionTitle">{heading}</h2>
          <p className="admin-sectionText">{description}</p>
        </div>
        {hasFilter ? (
          <Link href="/admin/orders" className="admin-button admin-button--secondary admin-button--small">
            Clear filter
          </Link>
        ) : null}
        <a href="/api/admin/exports/orders" className="admin-button admin-button--secondary admin-button--small">
          Export CSV
        </a>
      </section>

      <div className="admin-metricGrid">
        <section className="admin-surface admin-metricCard">
          <p className="admin-metricCard__label">Total Orders</p>
          <p className="admin-metricCard__value">{filteredOrders.length}</p>
          <p className="admin-metricCard__hint">Live order volume for the current view.</p>
        </section>
        <section className="admin-surface admin-metricCard">
          <p className="admin-metricCard__label">Pending</p>
          <p className="admin-metricCard__value">{pendingCount}</p>
          <p className="admin-metricCard__hint">Orders waiting on action or payment confirmation.</p>
        </section>
        <section className="admin-surface admin-metricCard">
          <p className="admin-metricCard__label">Revenue</p>
          <p className="admin-metricCard__value">{moneyWithSymbol(revenue)}</p>
          <p className="admin-metricCard__hint">Delivered: {deliveredCount} orders</p>
        </section>
      </div>

      <section className="admin-surface admin-tableCard">
        {filteredOrders.length === 0 ? (
          <div className="admin-emptyState">
            <div className="admin-emptyState__icon">◌</div>
            <h3>No orders yet</h3>
            <p>New checkouts will appear here with clear payment and fulfillment status badges.</p>
          </div>
        ) : (
          <div className="admin-tableWrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Payment ID</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td><span className="admin-orderCode">#{order.id.slice(0, 8).toUpperCase()}</span></td>
                    <td>
                      <p className="admin-tableProduct__name">{order.customer_name || '—'}</p>
                      {order.customer_email && <p className="admin-tableProduct__meta">{order.customer_email}</p>}
                    </td>
                    <td style={{ color: 'var(--admin-text)', fontWeight: 700 }}>{moneyWithSymbol(order.total_amount ?? 0)}</td>
                    <td><StatusBadge status={order.status ?? 'Pending'} /></td>
                    <td><span className="admin-badge admin-badge--info">{formatPaymentMethod(order.payment_method)}</span></td>
                    <td><span className="admin-orderCode">{order.razorpay_payment_id ? `${order.razorpay_payment_id.slice(0, 16)}…` : '—'}</span></td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleDateString(tenantConfig.region.numberLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} className="admin-button admin-button--secondary admin-button--small">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const className = {
    Pending: 'admin-badge admin-badge--neutral',
    Paid: 'admin-badge admin-badge--info',
    'Payment Failed': 'admin-badge admin-badge--danger',
    Processing: 'admin-badge admin-badge--warning',
    Shipped: 'admin-badge admin-badge--accent',
    Delivered: 'admin-badge admin-badge--success',
    Cancelled: 'admin-badge admin-badge--neutral',
    Refunded: 'admin-badge admin-badge--info',
    'Return Requested': 'admin-badge admin-badge--warning',
    Returned: 'admin-badge admin-badge--neutral',
  }[status] ?? 'admin-badge admin-badge--neutral'

  return (
    <span className={className}>
      {status}
    </span>
  )
}

function formatPaymentMethod(method?: string | null) {
  switch (method) {
    case 'cod':
      return 'COD'
    case 'manual':
      return 'Manual'
    case 'whatsapp_cod':
      return 'WhatsApp COD'
    case 'razorpay':
      return 'Razorpay'
    default:
      return 'Razorpay'
  }
}
