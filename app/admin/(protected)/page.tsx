import { requireAdminPermission } from '@/lib/adminAuth'
import Link from 'next/link'
import { moneyWithSymbol } from '@/lib/money'
import { fetchInternalApi } from '@/lib/server/internalApi'
import { logger } from '@/lib/server/logger'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { tenantConfig } from '@/lib/tenant.config'

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
  source?: string | null
  order_items?: OrderItem[] | null
}

type ChannelOrderRow = {
  source: string | null
  total_amount: number | null
}

type LowStockVariantRow = {
  id: string
  product_id: string
  stock: number | null
  weight: string | null
  products: Array<{
    id: string
    name: string
    is_active: boolean
  }>
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function shortDayLabel(date: Date) {
  return date.toLocaleDateString(tenantConfig.region.numberLocale, { weekday: 'short' })
}

function orderSource(row: ChannelOrderRow): 'whatsapp' | 'web' {
  return row.source === 'whatsapp' ? 'whatsapp' : 'web'
}

function shouldLogDashboardFallback(error: unknown): boolean {
  if (!(error instanceof Error)) return true
  return !error.message.includes('Dynamic server usage')
}

export default async function AdminDashboard() {
  await requireAdminPermission('analytics:read')
  const supabase = getSupabaseAdmin()
  let safeOrders: DashboardOrder[] = []
  try {
    const { orders } = await fetchInternalApi<{
      orders: DashboardOrder[]
    }>('/api/orders/list')
    safeOrders = orders ?? []
  } catch (error) {
    if (shouldLogDashboardFallback(error)) {
      logger.warn('admin.dashboard.orders_fetch_failed', { error })
    }
    safeOrders = []
  }
  const totalOrders = safeOrders.length
  const totalRevenue = safeOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const thisMonthOrders = safeOrders.filter((order) => {
    const createdAt = order.created_at ? new Date(order.created_at) : null
    return createdAt && createdAt >= monthStart
  })

  const lastMonthOrders = safeOrders.filter((order) => {
    const createdAt = order.created_at ? new Date(order.created_at) : null
    return createdAt && createdAt >= lastMonthStart && createdAt < monthStart
  })

  const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0)
  const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0)
  const thisMonthAverageOrderValue = thisMonthOrders.length > 0 ? thisMonthRevenue / thisMonthOrders.length : 0

  let monthComparisonText = 'New data'
  let monthComparisonColor = 'var(--admin-text-muted)'

  if (lastMonthRevenue > 0) {
    const changePercent = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    if (changePercent > 0) {
      monthComparisonText = `↑ ${changePercent.toFixed(1)}% vs last month`
      monthComparisonColor = '#047857'
    } else if (changePercent < 0) {
      monthComparisonText = `↓ ${Math.abs(changePercent).toFixed(1)}% vs last month`
      monthComparisonColor = '#b91c1c'
    } else {
      monthComparisonText = 'New data'
      monthComparisonColor = 'var(--admin-text-muted)'
    }
  }

  let channelData: ChannelOrderRow[] = []
  try {
    const { data: channelRows, error: channelError } = await supabase
      .from('orders')
      .select('source, total_amount')

    if (channelError) {
      throw channelError
    }

    channelData = (channelRows ?? []) as ChannelOrderRow[]
  } catch (error) {
    logger.warn('admin.dashboard.channel_analytics_failed', { error })
    channelData = []
  }

  const whatsappOrders = channelData.filter((row) => orderSource(row) === 'whatsapp')
  const webOrders = channelData.filter((row) => orderSource(row) === 'web')
  const whatsappOrdersCount = whatsappOrders.length
  const webOrdersCount = webOrders.length
  const whatsappRevenue = whatsappOrders.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
  const webRevenue = webOrders.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0)
  const totalChannelOrders = whatsappOrdersCount + webOrdersCount
  const webPercent = totalChannelOrders > 0 ? (webOrdersCount / totalChannelOrders) * 100 : 0
  const whatsappPercent = totalChannelOrders > 0 ? (whatsappOrdersCount / totalChannelOrders) * 100 : 0

  let lowStockVariants: LowStockVariantRow[] = []
  try {
    const { data: lowStockRows, error: lowStockError } = await supabase
      .from('product_variants')
      .select('id, product_id, stock, weight, products!inner(id, name, is_active)')
      .lte('stock', 10)
      .eq('products.is_active', true)
      .order('stock', { ascending: true })

    if (lowStockError) {
      throw lowStockError
    }

    lowStockVariants = ((lowStockRows ?? []) as LowStockVariantRow[]).filter(
      (variant) => Number(variant.stock ?? 0) <= 10
    )
  } catch (error) {
    logger.warn('admin.dashboard.low_stock_failed', { error })
    lowStockVariants = []
  }

  const lowStockPreview = lowStockVariants.slice(0, 5)

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
      <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <StatCard href="/admin/orders" label="Total Orders" value={String(totalOrders)} hint="All-time completed and active orders." />
        <StatCard href="/admin/orders" label="Revenue" value={moneyWithSymbol(totalRevenue)} hint={`This month: ${moneyWithSymbol(thisMonthRevenue)}`} />
        <StatCard href="/admin/orders?scope=today" label="Today Orders" value={String(todaysOrders)} hint="Click through to review today’s orders." />
        <section className="admin-surface admin-metricCard admin-interactiveCard">
          <p className="admin-metricCard__label">This Month</p>
          <p className="admin-metricCard__value">{moneyWithSymbol(thisMonthRevenue)}</p>
          <p className="admin-metricCard__hint" style={{ color: monthComparisonColor }}>
            {monthComparisonText}
          </p>
          <p className="admin-metricCard__hint">Avg order value {moneyWithSymbol(thisMonthAverageOrderValue)}</p>
        </section>
      </div>

      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Channel Breakdown</p>
        <h2 className="admin-sectionTitle">Order channels</h2>
        <p className="admin-sectionText">Compare website and WhatsApp performance at a glance.</p>

        <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '16px' }}>
          <div className="admin-listRow" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="admin-metricCard__label" style={{ marginBottom: '8px' }}>Website</p>
              <p className="admin-metricCard__value" style={{ marginTop: 0, fontSize: '2rem' }}>{webOrdersCount}</p>
              <p className="admin-metricCard__hint">Revenue: {moneyWithSymbol(webRevenue)}</p>
            </div>
            <span style={{ color: 'var(--tenant-primary-gradient-end)', fontSize: '18px' }}>●</span>
          </div>

          <div className="admin-listRow" style={{ alignItems: 'flex-start' }}>
            <div>
              <p className="admin-metricCard__label" style={{ marginBottom: '8px' }}>WhatsApp</p>
              <p className="admin-metricCard__value" style={{ marginTop: 0, fontSize: '2rem' }}>{whatsappOrdersCount}</p>
              <p className="admin-metricCard__hint">Revenue: {moneyWithSymbol(whatsappRevenue)}</p>
            </div>
            <span style={{ color: 'var(--tenant-primary-dark)', fontSize: '18px' }}>●</span>
          </div>
        </div>

        <div style={{ marginTop: '14px' }}>
          <div
            style={{
              display: 'flex',
              width: '100%',
              borderRadius: '999px',
              overflow: 'hidden',
              background: 'rgba(15, 23, 42, 0.08)',
              height: '30px',
            }}
            aria-label="Order channel percentages"
          >
            <div
              style={{
                width: `${webPercent}%`,
                background: 'var(--tenant-primary-gradient-end)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {webPercent >= 22 ? `${webPercent.toFixed(0)}%` : ''}
            </div>
            <div
              style={{
                width: `${whatsappPercent}%`,
                background: 'var(--tenant-primary-dark)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {whatsappPercent >= 22 ? `${whatsappPercent.toFixed(0)}%` : ''}
            </div>
          </div>

          <div className="admin-summaryRow" style={{ marginTop: '8px', borderTop: 'none', paddingTop: 0 }}>
            <span className="admin-summaryRow__label">Website {webPercent.toFixed(1)}%</span>
            <span className="admin-summaryRow__label">WhatsApp {whatsappPercent.toFixed(1)}%</span>
          </div>
        </div>
      </section>

      {lowStockVariants.length > 0 ? (
        <section
          className="admin-surface"
          style={{ border: '1px solid #fdba74', background: 'linear-gradient(180deg, #fffaf0, #fff7ed)' }}
        >
          <p className="admin-sectionEyebrow" style={{ color: '#b45309' }}>Inventory Alert</p>
          <h2 className="admin-sectionTitle" style={{ color: '#92400e' }}>
            {lowStockVariants.length} products are low on stock
          </h2>
          <div className="admin-listStack" style={{ marginTop: '12px' }}>
            {lowStockPreview.map((variant) => (
              <Link
                key={variant.id}
                href={`/admin/products/${variant.product_id}`}
                className="admin-listRow"
                style={{ textDecoration: 'none' }}
              >
                <div>
                  <p className="admin-tableProduct__name" style={{ marginBottom: '2px' }}>
                    {variant.products?.[0]?.name ?? 'Product'} · {variant.weight || 'Variant'}
                  </p>
                  <p className="admin-tableProduct__meta">Tap to manage inventory</p>
                </div>
                <span className={`admin-badge ${Number(variant.stock ?? 0) === 0 ? 'admin-badge--danger' : 'admin-badge--warning'}`}>
                  {Number(variant.stock ?? 0)} stock
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

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
                            ? new Date(order.created_at).toLocaleString(tenantConfig.region.numberLocale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Unknown time'}
                        </p>
                      </div>
                    </td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleDateString(tenantConfig.region.numberLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
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
