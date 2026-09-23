import Link from 'next/link'
import SignOutButton from '../SignOutButton'
export default function AccessDeniedPage() {
  return <main style={{ padding: '3rem', maxWidth: 640, margin: 'auto' }}>
    <h1>Access restricted</h1>
    <p>Your role does not have access to this page. Choose an area available to your role, or ask the store owner for access.</p>
    <p><Link href="/admin/orders">Orders</Link> · <Link href="/admin/products">Products</Link> · <Link href="/">Storefront</Link></p>
    <SignOutButton />
  </main>
}