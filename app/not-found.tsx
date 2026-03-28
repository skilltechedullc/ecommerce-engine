import Link from 'next/link'

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#F4F7F4' }}>
      <section style={{ width: 'min(560px, 100%)', background: '#FFFFFF', border: '1px solid #D8E6DD', borderRadius: '22px', padding: '28px' }}>
        <p style={{ margin: '0 0 10px', fontSize: '12px', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 700, color: '#2A6A4E' }}>
          Page not found
        </p>
        <h1 style={{ margin: '0 0 12px', fontSize: '34px', lineHeight: 1.2 }}>This page does not exist.</h1>
        <p style={{ margin: '0 0 20px', color: '#4E6A5C', lineHeight: 1.6 }}>
          The link may be outdated, or the page may have moved. You can continue shopping from the collection.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            href="/products"
            style={{
              borderRadius: '999px',
              padding: '11px 18px',
              background: '#16623E',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Browse Products
          </Link>
          <Link
            href="/"
            style={{
              borderRadius: '999px',
              padding: '11px 18px',
              background: '#EAF2EC',
              color: '#1A4E37',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  )
}
