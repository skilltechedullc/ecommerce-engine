'use client'

import Link from 'next/link'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  void _error

  return (
    <html>
      <body style={{ margin: 0, background: '#F4F7F4', color: '#143828', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
          <section style={{ width: 'min(560px, 100%)', background: '#FFFFFF', border: '1px solid #D8E6DD', borderRadius: '22px', padding: '28px' }}>
            <p style={{ margin: '0 0 10px', fontSize: '12px', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 700, color: '#2A6A4E' }}>
              Something went wrong
            </p>
            <h1 style={{ margin: '0 0 12px', fontSize: '34px', lineHeight: 1.2 }}>We could not load this page right now.</h1>
            <p style={{ margin: '0 0 20px', color: '#4E6A5C', lineHeight: 1.6 }}>
              Try refreshing this view. If the issue continues, you can return to shopping and come back in a moment.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: '11px 18px',
                  background: '#16623E',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <Link
                href="/products"
                style={{
                  borderRadius: '999px',
                  padding: '11px 18px',
                  background: '#EAF2EC',
                  color: '#1A4E37',
                  textDecoration: 'none',
                  fontWeight: 700,
                }}
              >
                Browse Products
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
