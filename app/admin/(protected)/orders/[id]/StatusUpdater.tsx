'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ORDER_STATUSES, ORDER_STATUS_PROGRESSION, type OrderStatus as SharedOrderStatus } from '@/lib/orderStatus'

const STATUSES = ORDER_STATUSES
type Status = SharedOrderStatus

const STATUS_STYLES: Record<Status, { bg: string; color: string; border: string }> = {
  Pending:    { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
  Paid:       { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  Processing: { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  Shipped:    { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
  Delivered:  { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' },
}

export default function StatusUpdater({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Status>(
    (STATUSES.includes(currentStatus as Status) ? currentStatus : 'Pending') as Status
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const s = STATUS_STYLES[selected]
  const changed = selected !== currentStatus
  
  // Get allowed next statuses
  const currentStatusTyped = STATUSES.includes(currentStatus as Status) ? (currentStatus as Status) : 'Pending'
  const allowedNextStatuses = ORDER_STATUS_PROGRESSION[currentStatusTyped]
  const canTransition = allowedNextStatuses.length > 0

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/admin/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, newStatus: selected }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to update')
      setSaved(true)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-surface">
      <p className="admin-sectionEyebrow">Fulfillment</p>
      <h2 className="admin-sectionTitle">Order status</h2>
      <p className="admin-sectionText">Update the current state without leaving the order detail workflow.</p>

      <div className="admin-statusControl" style={{ marginTop: '18px' }}>
        <span
          className="admin-badge"
          style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}
        >
          {selected}
        </span>

        <span style={{ color: 'var(--admin-text-soft)', fontSize: '18px' }}>→</span>

        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value as Status)
            setSaved(false)
          }}
          disabled={!canTransition}
          style={{ minWidth: '180px', opacity: canTransition ? 1 : 0.5 }}
        >
          <option value={currentStatusTyped}>{currentStatusTyped}</option>
          {allowedNextStatuses.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        <button
          onClick={handleSave}
          disabled={saving || !changed}
          className="admin-button admin-button--primary"
          style={{
            opacity: saving || !changed ? 0.55 : 1,
            cursor: saving || !changed ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {saved && !changed && (
          <span className="admin-inlineMessage admin-inlineMessage--success">
            ✓ Status updated
          </span>
        )}
        {error && (
          <span className="admin-inlineMessage admin-inlineMessage--error">
            {error}
          </span>
        )}
        {!canTransition && (
          <span className="admin-inlineMessage admin-inlineMessage--info">
            ℹ This order has reached its final state and cannot be changed further.
          </span>
        )}
      </div>
    </section>
  )
}
