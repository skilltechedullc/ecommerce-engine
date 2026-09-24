'use client'
import styles from './import.module.css'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { replaceCart, type CartItem } from '@/lib/cart'
import { moneyWithSymbol } from '@/lib/money'
export default function ImportCartPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve().then(async () => {
      const raw = new URLSearchParams(window.location.hash.slice(1)).get('items')
      if (!raw || raw.length > 10000) throw new Error('This cart link is invalid. Please request a new one.')
      let selection: unknown
      try { selection = JSON.parse(raw) } catch { throw new Error('This cart link is invalid.') }
      const response = await fetch('/api/cart/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selection), signal: controller.signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load cart')
      if (!controller.signal.aborted) setItems(data.items)
    }).catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [])
  return <main className={styles.page}>
    <h1>Review your WhatsApp cart</h1>
    <p>These are the current store prices. Delivery charges are calculated at checkout.</p>
    {error ? <p role="alert">{error}</p> : !items.length ? <p>Loading your cart…</p> : <>
      <ul>{items.map(item => <li key={item.id}>{item.name} ({item.variant_name}) × {item.quantity} — {moneyWithSymbol(item.price * item.quantity)}</li>)}</ul>
      <p>Continuing replaces any existing website cart with this selection.</p>
      <button onClick={() => { replaceCart(items); router.push('/checkout') }}>Use this cart and continue</button>
    </>}
    <p><Link href="/products">Return to shop</Link></p>
  </main>
}
