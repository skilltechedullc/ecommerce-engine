'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    try {
      await fetch('/api/admin-login', { method: 'DELETE' })
    } finally {
      router.push('/admin/login')
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className={className}
      style={{
        background: 'none',
        border: 'none',
        fontSize: '13px',
        color: '#7AAF9A',
        cursor: loading ? 'not-allowed' : 'pointer',
        padding: 0,
        textAlign: 'left',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Signing out…' : '← Sign out'}
    </button>
  )
}
