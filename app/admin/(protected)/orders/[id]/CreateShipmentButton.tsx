'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  orderId: string
}

export default function CreateShipmentButton({ orderId }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateShipment() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/shipping/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }

      if (!response.ok) {
        setError(payload.error ?? 'Failed to create shipment')
        return
      }

      router.refresh()
    } catch {
      setError('Failed to create shipment')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '8px', maxWidth: '360px' }}>
      <button
        type="button"
        className="admin-btn admin-btn--primary"
        disabled={isLoading}
        onClick={handleCreateShipment}
      >
        {isLoading ? 'Creating shipment...' : 'Create Shipment'}
      </button>
      {error ? (
        <p style={{ margin: 0, color: '#b91c1c', fontSize: '13px' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
