'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    const confirmed = window.confirm(`Delete ${name}? This will remove all its variants.`)
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch('/api/products/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Delete failed')

      router.refresh()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to delete product')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="admin-button admin-button--danger admin-button--small"
      style={{ cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}
