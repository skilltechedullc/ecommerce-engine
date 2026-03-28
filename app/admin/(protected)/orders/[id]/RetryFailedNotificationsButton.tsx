'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function RetryFailedNotificationsButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string>('')

  async function retryFailed() {
    setMessage('')
    try {
      const response = await fetch(`/api/admin/order-notifications/${orderId}/retry-failed`, {
        method: 'POST',
      })
      const payload = await response.json() as {
        success?: boolean
        error?: string
        data?: { retried: number; sent: number; failed: number; skipped: number }
        retried?: number
        sent?: number
        failed?: number
        skipped?: number
      }

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error ?? 'Failed to retry notifications')
      }

      const retried = payload.data?.retried ?? payload.retried ?? 0
      const sent = payload.data?.sent ?? payload.sent ?? 0
      const failed = payload.data?.failed ?? payload.failed ?? 0
      const skipped = payload.data?.skipped ?? payload.skipped ?? 0
      setMessage(`Retried ${retried}. Sent ${sent}, Failed ${failed}, Skipped ${skipped}.`)

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Retry failed')
    }
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <button
        type="button"
        onClick={retryFailed}
        disabled={pending}
        className="admin-btn admin-btn--ghost"
        style={{ minHeight: '40px' }}
      >
        {pending ? 'Retrying failed notifications…' : 'Resend Failed Notifications'}
      </button>
      {message ? (
        <p className="admin-sectionText" style={{ margin: 0 }}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
