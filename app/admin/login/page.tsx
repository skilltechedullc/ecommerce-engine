'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { storeConfig } from '@/lib/config'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      const data = await res.json()
      setError(data.error || 'Invalid password')
    }
    setLoading(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F4F6F8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '40px 36px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid #E5E7EB',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '11px', color: '#1B4332', letterSpacing: '1.8px', textTransform: 'uppercase', margin: '0 0 6px', fontWeight: '600' }}>
            {storeConfig.brandName}
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: 0 }}>
            Admin Sign In
          </h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', letterSpacing: '0.5px' }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: '1.5px solid #D1D5DB',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#111827',
                backgroundColor: '#FAFAFA',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px',
              backgroundColor: loading ? '#7AAF9A' : '#1B4332',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
