import Link from 'next/link'
import { moneyWithSymbol } from '@/lib/money'
import { fetchInternalApi } from '@/lib/server/internalApi'

type OrderItem = {
  product_name: string | null
  quantity: number | null
  price: number | null
}

type DashboardOrder = {
  id: string
  total_amount: number | null
  created_at: string | null
  status: string | null
  order_items?: OrderItem[] | null
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function shortDayLabel(date: Date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short' })
}

export default async function AdminDashboard() {
  const { orders } = await fetchInternalApi<{
    orders: DashboardOrder[]
  }>('/api/orders/list')

  const safeOrders = orders ?? []
  const totalOrders = safeOrders.length
  const totalRevenue = safeOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const todayStr = new Date().toISOString().slice(0, 10)
  const todaysOrders = safeOrders.filter((order) => order.created_at?.startsWith(todayStr)).length
  const recentOrders = safeOrders.slice(0, 5)

  const currentDate = new Date()
  const dayKeys = Array.from({ length: 7 }, (_, index) => {
    const nextDate = new Date(currentDate)
    nextDate.setDate(currentDate.getDate() - (6 - index))
    return { key: dateKey(nextDate), label: shortDayLabel(nextDate) }
  })

  const bars = dayKeys.map((day) => {
    const matches = safeOrders.filter((order) => order.created_at?.startsWith(day.key))
    return {
      ...day,
      orders: matches.length,
      revenue: matches.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0),
    }
  })

  const maxRevenue = Math.max(...bars.map((bar) => bar.revenue), 1)
  const revenueLast7Days = bars.reduce((sum, bar) => sum + bar.revenue, 0)
  const orderCountLast7Days = bars.reduce((sum, bar) => sum + bar.orders, 0)

  const topProducts = Array.from(
    safeOrders.reduce((acc, order) => {
      for (const item of order.order_items ?? []) {
        const name = item.product_name ?? 'Untitled product'
        const quantity = Number(item.quantity ?? 0)
        const revenue = Number(item.price ?? 0) * quantity
        const existing = acc.get(name) ?? { name, quantity: 0, revenue: 0 }
        existing.quantity += quantity
        existing.revenue += revenue
        acc.set(name, existing)
      }
      return acc
    }, new Map<string, { name: string; quantity: number; revenue: number }>()).values()
  )
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5)

  return (
    <div className="admin-stack">
      <div className="admin-metricGrid">
        <StatCard href="/admin/orders" label="Total Orders" value={String(totalOrders)} hint="All-time completed and active orders." />
        <StatCard href="/admin/orders" label="Revenue" value={moneyWithSymbol(totalRevenue)} hint={`Average order value ${moneyWithSymbol(averageOrderValue)}`} />
        <StatCard href="/admin/orders?scope=today" label="Today Orders" value={String(todaysOrders)} hint="Click through to review today’s orders." />
      </div>

      <div className="admin-detailGrid">
        <section className="admin-surface">
          <p className="admin-sectionEyebrow">Sales Snapshot</p>
          <h2 className="admin-sectionTitle">Store momentum</h2>
          <p className="admin-sectionText">Real revenue and order flow for the last seven days.</p>

          <div className="admin-chartPlaceholder">
            <div className="admin-summaryRow">
              <span className="admin-summaryRow__label">Revenue, last 7 days</span>
              <span className="admin-summaryRow__value">{moneyWithSymbol(revenueLast7Days)}</span>
            </div>
            <div className="admin-summaryRow">
              <span className="admin-summaryRow__label">Orders, last 7 days</span>
              <span className="admin-summaryRow__value">{orderCountLast7Days}</span>
            </div>
            <div className="admin-chartGrid" aria-label="Last seven days revenue chart">
              {bars.map((bar) => (
                <div key={bar.key} className="admin-chartColumn">
                  <span className="admin-chartColumn__value">{moneyWithSymbol(bar.revenue)}</span>
                  <div className="admin-chartColumn__track">
                    <div
                      className="admin-chartColumn__bar"
                      style={{ height: `${Math.max((bar.revenue / maxRevenue) * 100, bar.revenue > 0 ? 14 : 0)}%` }}
                    />
                  </div>
                  <span className="admin-chartColumn__label">{bar.label}</span>
                  <span className="admin-chartColumn__meta">{bar.orders} orders</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="admin-surface">
          <p className="admin-sectionEyebrow">Best Performers</p>
          <h2 className="admin-sectionTitle">Top products</h2>
          <p className="admin-sectionText">Ranked by revenue, with quantity sold shown for faster catalog decisions.</p>

          {topProducts.length === 0 ? (
            <div className="admin-emptyState">
              <div className="admin-emptyState__icon">◎</div>
              <h3>No product movement yet</h3>
              <p>Top products will appear here after orders start flowing in.</p>
            </div>
          ) : (
            <div className="admin-listStack" style={{ marginTop: '18px' }}>
              {topProducts.map((product) => (
                <div key={product.name} className="admin-listRow">
                  <div>
                    <p className="admin-tableProduct__name">{product.name}</p>
                    <p className="admin-tableProduct__meta">{product.quantity} units sold</p>
                  </div>
                  <strong className="admin-summaryRow__value">{moneyWithSymbol(product.revenue)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="admin-surface admin-tableCard">
        <div style={{ padding: '24px 24px 6px' }}>
          <p className="admin-sectionEyebrow">Recent Activity</p>
          <h2 className="admin-sectionTitle">Recent orders</h2>
          <p className="admin-sectionText">Latest customer checkouts and payment activity.</p>
        </div>

        {recentOrders.length === 0 ? (
          <div className="admin-emptyState">
            <div className="admin-emptyState__icon">◌</div>
            <h3>No recent orders yet</h3>
            <p>Once customers begin checking out, the latest orders will appear here.</p>
          </div>
        ) : (
          <div className="admin-tableWrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Placed</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div>
                        <p className="admin-tableProduct__name">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="admin-tableProduct__meta">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Unknown time'}
                        </p>
                      </div>
                    </td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                    <td style={{ color: 'var(--admin-text)', fontWeight: 700 }}>{moneyWithSymbol(order.total_amount ?? 0)}</td>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} className="admin-button admin-button--secondary admin-button--small">
                        View order
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

function StatCard({ href, label, value, hint }: { href: string; label: string; value: string; hint: string }) {
  return (
    <Link href={href} className="admin-metricLink">
      <section className="admin-surface admin-metricCard admin-interactiveCard">
        <p className="admin-metricCard__label">{label}</p>
        <p className="admin-metricCard__value">{value}</p>
        <p className="admin-metricCard__hint">{hint}</p>
      </section>
    </Link>
  )
}
