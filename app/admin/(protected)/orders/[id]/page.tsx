import Link from 'next/link'
import { notFound } from 'next/navigation'
import StatusUpdater from './StatusUpdater'
import RetryFailedNotificationsButton from './RetryFailedNotificationsButton'
import { moneyWithSymbol } from '@/lib/money'
import { fetchInternalApi } from '@/lib/server/internalApi'

type OrderDetailPayload = {
  order: {
    id: string
    customer_name: string | null
    customer_email: string | null
    customer_phone: string | null
    customer_address: string | null
    total_amount: number | null
    status: string | null
    razorpay_order_id: string | null
    razorpay_payment_id: string | null
    created_at: string | null
  }
  items: Array<{
    id: string
    product_id: string | null
    product_name: string | null
    price: number | null
    quantity: number | null
  }>
}

type NotificationLogsPayload = {
  logs: Array<{
    id: string
    event: string | null
    channel: string | null
    status: string | null
    recipient: string | null
    provider: string | null
    provider_message_id: string | null
    attempt_count: number | null
    last_error: string | null
    next_retry_at: string | null
    created_at: string | null
    updated_at: string | null
  }>
}


export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  let payload: OrderDetailPayload
  let notificationLogs: NotificationLogsPayload['logs'] = []
  try {
    ;[payload, { logs: notificationLogs }] = await Promise.all([
      fetchInternalApi<OrderDetailPayload>(`/api/orders/${id}`),
      fetchInternalApi<NotificationLogsPayload>(`/api/admin/order-notifications/${id}`),
    ])
  } catch {
    notFound()
  }

  const { order, items } = payload

  return (
    <div className="admin-stack">
      <Link href="/admin/orders" className="admin-backLink">
        ← Back to Orders
      </Link>

      <section className="admin-surface admin-pageLead">
        <div>
          <p className="admin-sectionEyebrow">Order Overview</p>
          <h2 className="admin-sectionTitle">Customer and fulfillment details</h2>
          <p className="admin-sectionText">Review who placed the order, what was purchased, and the current payment trail.</p>
        </div>
        <div>
          <p className="admin-inputShell__label" style={{ marginBottom: '6px' }}>Order ID</p>
          <p className="admin-orderCode">#{order.id.toUpperCase()}</p>
        </div>
      </section>

      <StatusUpdater orderId={order.id} currentStatus={order.status ?? 'Pending'} />

      <div className="admin-detailGrid">
        <InfoCard title="Customer" description="Primary contact details for this order.">
          <InfoRow label="Name" value={order.customer_name || '—'} />
          <InfoRow label="Email" value={order.customer_email || '—'} />
          <InfoRow label="Phone" value={order.customer_phone || '—'} />
        </InfoCard>

        <InfoCard title="Payment" description="Transaction identifiers and checkout timing.">
          <InfoRow
            label="Razorpay Order ID"
            value={order.razorpay_order_id || '—'}
            mono
          />
          <InfoRow
            label="Payment ID"
            value={order.razorpay_payment_id || '—'}
            mono
          />
          <InfoRow
            label="Date"
            value={
              order.created_at
                ? new Date(order.created_at).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })
                : '—'
            }
          />
        </InfoCard>
      </div>

      {order.customer_address && (
        <InfoCard title="Shipping Address" description="The destination captured during checkout.">
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--admin-text)', lineHeight: '1.7' }}>
            {order.customer_address}
          </p>
        </InfoCard>
      )}

      <section className="admin-surface admin-tableCard">
        <div style={{ padding: '24px 24px 8px' }}>
          <p className="admin-sectionEyebrow">Notifications</p>
          <h2 className="admin-sectionTitle">Email and WhatsApp delivery logs</h2>
          <p className="admin-sectionText">Audit transactional notification outcomes, retries, and provider message IDs.</p>
          <div style={{ marginTop: '12px', maxWidth: '320px' }}>
            <RetryFailedNotificationsButton orderId={order.id} />
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Channel</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Attempts</th>
              <th>Recipient</th>
              <th style={{ textAlign: 'right' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {notificationLogs.length > 0 ? (
              notificationLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="admin-summaryRow__value" style={{ textTransform: 'capitalize' }}>
                      {(log.event ?? 'unknown').replaceAll('_', ' ')}
                    </span>
                    {log.provider_message_id ? (
                      <p className="admin-tableProduct__meta" style={{ marginTop: '4px' }}>
                        Provider ID: {log.provider_message_id}
                      </p>
                    ) : null}
                  </td>
                  <td>
                    <span className="admin-summaryRow__label" style={{ textTransform: 'uppercase' }}>
                      {log.channel ?? '—'}
                    </span>
                    {log.provider ? (
                      <p className="admin-tableProduct__meta" style={{ marginTop: '4px' }}>
                        via {log.provider}
                      </p>
                    ) : null}
                  </td>
                  <td>
                    <StatusPill status={log.status ?? 'unknown'} />
                    {log.last_error ? (
                      <p className="admin-tableProduct__meta" style={{ marginTop: '6px', color: '#b91c1c' }}>
                        {log.last_error}
                      </p>
                    ) : null}
                    {log.next_retry_at ? (
                      <p className="admin-tableProduct__meta" style={{ marginTop: '4px' }}>
                        Retry at {new Date(log.next_retry_at).toLocaleString('en-IN')}
                      </p>
                    ) : null}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {log.attempt_count ?? 0}
                  </td>
                  <td>
                    <span className="admin-summaryRow__value" style={{ wordBreak: 'break-all' }}>
                      {log.recipient || '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-soft)' }}>
                  No notifications logged yet for this order.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="admin-surface admin-tableCard">
        <div style={{ padding: '24px 24px 8px' }}>
          <p className="admin-sectionEyebrow">Line Items</p>
          <h2 className="admin-sectionTitle">Ordered products</h2>
          <p className="admin-sectionText">Clear visibility into unit pricing, quantity, and item subtotals.</p>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th style={{ textAlign: 'center' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Unit Price</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items && items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="admin-tableProduct__name">
                      {item.product_name || item.product_id}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {moneyWithSymbol(item.price ?? 0)}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--admin-text)', fontWeight: 700 }}>
                    {moneyWithSymbol((item.price ?? 0) * (item.quantity ?? 1))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--admin-text-soft)' }}>
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="admin-statusControl" style={{ borderTop: '1px solid var(--admin-border)', justifyContent: 'flex-end' }}>
          <span className="admin-summaryRow__label">Total amount</span>
          <span className="admin-totalAmount">{moneyWithSymbol(order.total_amount ?? 0)}</span>
        </div>
      </section>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const style = normalized === 'sent'
    ? { background: '#ecfdf3', color: '#166534', border: '#bbf7d0' }
    : normalized === 'failed'
      ? { background: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
      : { background: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '24px',
        padding: '0 10px',
        borderRadius: '999px',
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  )
}

function InfoCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="admin-surface">
      <p className="admin-sectionEyebrow">{title}</p>
      <h2 className="admin-sectionTitle">{title}</h2>
      {description && <p className="admin-sectionText">{description}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '16px' }}>
        {children}
      </div>
    </section>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="admin-summaryRow">
      <span className="admin-summaryRow__label" style={{ flexShrink: 0 }}>{label}</span>
      <span
        className={`admin-summaryRow__value${mono ? ' admin-summaryRow__value--mono' : ''}`}
        style={{ textAlign: 'right', wordBreak: 'break-all' }}
      >
        {value}
      </span>
    </div>
  )
}
