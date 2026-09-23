'use client'

import { useState } from 'react'
import { moneyWithSymbol } from '@/lib/money'

type TrackingOrder = {
  id: string
  customerName: string | null
  totalAmount: number | null
  status: string | null
  createdAt: string | null
  items: Array<{ product_name: string | null; quantity: number | null; price: number | null }>
  shipments: Array<{ provider: string | null; awb_number: string | null; tracking_url: string | null; status: string | null; estimated_delivery: string | null }>
}

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<TrackingOrder | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)

    try {
      const response = await fetch(`/api/orders/track?orderId=${encodeURIComponent(orderId)}&phone=${encodeURIComponent(phone)}`)
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Order not found')
      setOrder(json.order)
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Unable to track order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ width: 'min(920px, calc(100% - 32px))', margin: '48px auto', display: 'grid', gap: '20px' }}>
      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Order Tracking</p>
        <h1 className="admin-sectionTitle">Track your order</h1>
        <p className="admin-sectionText">Enter your order ID and billing phone number to see the latest public order status.</p>
        <p className="admin-sectionText" style={{ marginTop: '6px' }}>
          You can find the order ID in your email, WhatsApp confirmation, or checkout success screen.
        </p>

        <form onSubmit={handleSubmit} className="admin-formGrid" style={{ marginTop: '18px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label className="admin-inputShell">
            <span className="admin-inputShell__label">Order ID</span>
            <input value={orderId} onChange={(event) => setOrderId(event.target.value)} required />
          </label>
          <label className="admin-inputShell">
            <span className="admin-inputShell__label">Phone</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </label>
          <button className="admin-button admin-button--primary" type="submit" disabled={loading} style={{ alignSelf: 'end' }}>
            {loading ? 'Checking...' : 'Track Order'}
          </button>
        </form>

        {error ? <p className="admin-inlineMessage admin-inlineMessage--error" style={{ marginTop: '14px' }}>{error}</p> : null}
      </section>

      {order ? (
        <section className="admin-surface">
          <div className="admin-summaryRow" style={{ borderTop: 'none', paddingTop: 0 }}>
            <span className="admin-summaryRow__label">Status</span>
            <span className="admin-badge admin-badge--info">{order.status ?? 'Pending'}</span>
          </div>
          <div className="admin-summaryRow">
            <span className="admin-summaryRow__label">Order</span>
            <span className="admin-orderCode">#{order.id.toUpperCase()}</span>
          </div>
          <div className="admin-summaryRow">
            <span className="admin-summaryRow__label">Total</span>
            <span className="admin-summaryRow__value">{moneyWithSymbol(order.totalAmount ?? 0)}</span>
          </div>
          <div className="admin-listStack" style={{ marginTop: '14px' }}>
            {order.items.map((item, index) => (
              <div key={`${item.product_name}-${index}`} className="admin-listRow">
                <span className="admin-summaryRow__value">{item.product_name ?? 'Product'}</span>
                <span className="admin-summaryRow__label">Qty {item.quantity ?? 0}</span>
              </div>
            ))}
          </div>
          {order.shipments.length > 0 ? (
            <div className="admin-listStack" style={{ marginTop: '14px' }}>
              {order.shipments.map((shipment, index) => (
                <div key={`${shipment.awb_number}-${index}`} className="admin-listRow">
                  <div>
                    <p className="admin-summaryRow__value">{shipment.provider ?? 'Shipment'}</p>
                    <p className="admin-sectionText" style={{ margin: '4px 0 0' }}>{shipment.status ?? 'pending'}</p>
                  </div>
                  {shipment.tracking_url ? (
                    <a className="admin-button admin-button--secondary admin-button--small" href={shipment.tracking_url} target="_blank" rel="noreferrer">
                      Track
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <a
            className="admin-button admin-button--secondary admin-button--small"
            href={`/orders/receipt?orderId=${encodeURIComponent(order.id)}&phone=${encodeURIComponent(phone)}`}
            style={{ marginTop: '14px' }}
          >
            View receipt
          </a>
        </section>
      ) : null}
    </main>
  )
}
