'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { moneyWithSymbol } from '@/lib/money'
import { storeConfig } from '@/lib/config'

type ReceiptOrder = {
  id: string
  customer_name: string | null
  customer_phone: string | null
  totalAmount?: number | null
  total_amount?: number | null
  status: string | null
  payment_method?: string | null
  created_at: string | null
  items?: Array<{ product_name: string | null; quantity: number | null; price?: number | null }>
  order_items?: Array<{ product_name: string | null; quantity: number | null; price?: number | null }>
}

export default function ReceiptClient({
  initialOrderId,
  initialPhone,
}: {
  initialOrderId: string
  initialPhone: string
}) {
  const [orderId, setOrderId] = useState(initialOrderId)
  const [phone, setPhone] = useState(initialPhone)
  const [order, setOrder] = useState<ReceiptOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadReceipt(nextOrderId = orderId, nextPhone = phone) {
    if (!nextOrderId || !nextPhone) return
    setLoading(true)
    setError('')
    setOrder(null)

    try {
      const response = await fetch(`/api/orders/track?orderId=${encodeURIComponent(nextOrderId)}&phone=${encodeURIComponent(nextPhone)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Receipt not found')
      setOrder(data.order)
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Receipt not found')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialOrderId && initialPhone) {
      void loadReceipt(initialOrderId, initialPhone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderId, initialPhone])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void loadReceipt()
  }

  const items = order?.items ?? order?.order_items ?? []
  const total = Number(order?.totalAmount ?? order?.total_amount ?? 0)

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '32px 18px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gap: '18px' }}>
        <Link href="/orders/track" style={{ color: '#0f766e', fontWeight: 700, textDecoration: 'none' }}>
          Back to tracking
        </Link>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f766e' }}>
            Receipt
          </p>
          <h1 style={{ margin: 0, fontSize: '28px' }}>Download or print order receipt</h1>
          <form onSubmit={handleSubmit} style={{ marginTop: '18px', display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
              Order ID
              <input value={orderId} onChange={(event) => setOrderId(event.target.value)} required style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
              Phone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} required style={inputStyle} />
            </label>
            <button type="submit" disabled={loading} style={buttonStyle}>
              {loading ? 'Loading...' : 'Find Receipt'}
            </button>
          </form>
          {error ? <p style={{ margin: '14px 0 0', color: '#b91c1c', fontWeight: 700 }}>{error}</p> : null}
        </section>

        {order ? (
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '18px' }}>
              <div>
                <h2 style={{ margin: 0 }}>{storeConfig.brandName}</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b' }}>Order receipt</p>
              </div>
              <button type="button" onClick={() => window.print()} style={buttonStyle}>Print</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '18px' }}>
              <ReceiptFact label="Order ID" value={order.id} />
              <ReceiptFact label="Date" value={order.created_at ? new Date(order.created_at).toLocaleString() : '-'} />
              <ReceiptFact label="Customer" value={order.customer_name || '-'} />
              <ReceiptFact label="Status" value={order.status || '-'} />
              <ReceiptFact label="Payment" value={formatPaymentMethod(order.payment_method)} />
            </div>

            <div style={{ overflowX: 'auto', marginTop: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Item</th>
                    <th style={thStyle}>Qty</th>
                    <th style={thStyle}>Price</th>
                    <th style={thStyle}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.product_name}-${index}`}>
                      <td style={tdStyle}>{item.product_name || '-'}</td>
                      <td style={tdStyle}>{item.quantity ?? 0}</td>
                      <td style={tdStyle}>{item.price != null ? moneyWithSymbol(Number(item.price)) : '-'}</td>
                      <td style={tdStyle}>{item.price != null ? moneyWithSymbol(Number(item.price) * Number(item.quantity ?? 0)) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p style={{ margin: '22px 0 0', textAlign: 'right', fontSize: '22px', fontWeight: 800 }}>
              Total: {moneyWithSymbol(total)}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  )
}

function ReceiptFact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
      <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: 700 }}>{label}</span>
      <strong style={{ display: 'block', marginTop: '4px', wordBreak: 'break-word' }}>{value}</strong>
    </div>
  )
}

function formatPaymentMethod(method?: string | null) {
  switch (method) {
    case 'cod':
      return 'COD / Pay on delivery'
    case 'manual':
      return 'Manual payment'
    case 'whatsapp_cod':
      return 'WhatsApp COD'
    case 'razorpay':
      return 'Razorpay'
    default:
      return 'Razorpay'
  }
}

const inputStyle = {
  minHeight: '44px',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  padding: '0 12px',
}

const buttonStyle = {
  minHeight: '44px',
  alignSelf: 'end',
  border: '0',
  borderRadius: '10px',
  padding: '0 18px',
  background: '#0f766e',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
}

const thStyle = {
  textAlign: 'left' as const,
  borderBottom: '1px solid #cbd5e1',
  padding: '10px',
}

const tdStyle = {
  borderBottom: '1px solid #e2e8f0',
  padding: '10px',
}
