'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { getCartSnapshot, removeFromCart, updateQuantity, subscribeToCart, emitCartUpdated, CartItem } from '@/lib/cart'
import { formatMoney } from '@/lib/money'
import styles from './MiniCartDrawer.module.css'

type UpsellProduct = {
  id: string
  name: string
  slug: string
  image?: string | null
  price?: number | null
}

const EMPTY_CART: CartItem[] = []
function getServerSnapshot(): CartItem[] {
  return EMPTY_CART
}

const NAV_CLOSE_DELAY_MS = 180
const FREE_SHIPPING_THRESHOLD = 999

export default function MiniCartDrawer() {
  const router = useRouter()
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerSnapshot)
  const [open, setOpen] = useState(false)
  const [addedNoticeVisible, setAddedNoticeVisible] = useState(false)
  const [upsellProduct, setUpsellProduct] = useState<UpsellProduct | null>(null)
  const navigationTimerRef = useRef<number | null>(null)

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  )

  const shippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const shippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100))
  const shippingUnlocked = shippingRemaining <= 0
  const checkoutLabel = itemCount > 0 ? `Checkout Securely · ${formatMoney(subtotal)}` : 'Checkout Securely'

  useEffect(() => {
    function handleOpen() {
      setOpen(true)
      setAddedNoticeVisible(true)
      window.setTimeout(() => setAddedNoticeVisible(false), 1800)
    }

    function handleOpenFromHeader() {
      setOpen(true)
    }

    window.addEventListener('cart-open', handleOpen)
    window.addEventListener('cart-open-manual', handleOpenFromHeader)

    return () => {
      window.removeEventListener('cart-open', handleOpen)
      window.removeEventListener('cart-open-manual', handleOpenFromHeader)
    }
  }, [])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (!open || cart.length === 0) return

    let cancelled = false
    async function loadUpsell() {
      const cartIds = new Set(cart.map((item) => String(item.product_id)))
      const response = await fetch('/api/products/best-sellers?limit=8', { cache: 'no-store' })
      if (!response.ok) return

      const json = await response.json() as { products?: UpsellProduct[] }
      const data = json.products ?? []

      if (cancelled) return

      const next = data.find((product) => !cartIds.has(String(product.id))) ?? null
      setUpsellProduct(next)
    }

    void loadUpsell()

    return () => {
      cancelled = true
    }
  }, [open, cart])

  useEffect(() => {
    return () => {
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current)
      }
    }
  }, [])

  function closeDrawer() {
    setOpen(false)
  }

  function adjustQuantity(item: CartItem, nextQuantity: number) {
    if (nextQuantity <= 0) {
      removeFromCart(item.id)
    } else {
      updateQuantity(item.id, nextQuantity)
    }
    emitCartUpdated()
  }

  function goTo(path: string) {
    closeDrawer()
    if (navigationTimerRef.current !== null) {
      window.clearTimeout(navigationTimerRef.current)
    }
    navigationTimerRef.current = window.setTimeout(() => {
      router.push(path)
      navigationTimerRef.current = null
    }, NAV_CLOSE_DELAY_MS)
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
      >
        <header className={styles.header}>
          <div>
            <h2>Your Cart</h2>
            <p>{itemCount} {itemCount === 1 ? 'item' : 'items'}</p>
          </div>
          <button onClick={closeDrawer} className={styles.closeButton} aria-label="Close cart drawer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className={`${styles.addedNotice} ${addedNoticeVisible ? styles.addedNoticeVisible : ''}`}>
          Added to cart ✓
        </div>

        <div className={styles.body}>
          {cart.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Your cart is empty.</p>
              <button onClick={() => goTo('/products')} className={styles.emptyAction}>
                Browse Products
              </button>
            </div>
          ) : (
            <ul className={styles.itemList}>
              {cart.map((item) => (
                <li key={item.id} className={styles.itemRow}>
                  <div className={styles.thumbWrap}>
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className={styles.thumbImage} unoptimized />
                    ) : (
                      <div className={styles.thumbFallback} />
                    )}
                  </div>

                  <div className={styles.itemMeta}>
                    <p className={styles.itemName}>{item.name}</p>
                    <p className={styles.itemVariant}>{item.variant_name}</p>
                    <p className={styles.itemPrice}>{formatMoney(item.price)}</p>
                    <p className={styles.itemLineTotal}>Line total: {formatMoney(item.price * item.quantity)}</p>

                    <div className={styles.itemActions}>
                      <div className={styles.qtyControl}>
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${item.name}`}
                          onClick={() => adjustQuantity(item, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${item.name}`}
                          onClick={() => adjustQuantity(item, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => adjustQuantity(item, 0)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {cart.length > 0 && upsellProduct ? (
            <div className={styles.upsellCard}>
              <span>You may also like</span>
              <Link href={`/products/${upsellProduct.slug}`} onClick={closeDrawer} className={styles.upsellLink}>
                <strong>{upsellProduct.name}</strong>
                <em>{Number(upsellProduct.price ?? 0) > 0 ? formatMoney(Number(upsellProduct.price)) : 'View product'}</em>
              </Link>
            </div>
          ) : null}
        </div>

        {cart.length > 0 ? (
          <footer className={styles.footer}>
            <div className={styles.shippingProgressCard}>
              <div className={styles.shippingProgressHeader}>
                <span>Free shipping progress</span>
                <strong>{shippingUnlocked ? 'Unlocked' : `${formatMoney(shippingRemaining)} away`}</strong>
              </div>
              <div className={styles.shippingProgressTrack}>
                <span className={styles.shippingProgressFill} style={{ width: `${shippingProgress}%` }} />
              </div>
              <p className={styles.shippingProgressNote}>
                {shippingUnlocked
                  ? 'You have unlocked free shipping for this order.'
                  : `Add ${formatMoney(shippingRemaining)} more to unlock free shipping.`}
              </p>
            </div>

            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <p className={styles.shippingNote}>
              Packed within 2 to 6 business hours. Most orders dispatch in about 24 hours.
              Exact delivery ETA is shared once tracking is generated.
            </p>

            <div className={styles.trustRow}>
              <span>Secure checkout</span>
              <span>Fresh dispatch</span>
              <span>Verified products</span>
            </div>

            <button onClick={() => goTo('/checkout')} className={styles.checkoutButton}>
              {checkoutLabel}
            </button>

            <div className={styles.secondaryActions}>
              <button onClick={() => goTo('/cart')} className={styles.secondaryButton}>
                View Cart
              </button>
              <button onClick={closeDrawer} className={styles.secondaryGhostButton}>
                Continue Shopping
              </button>
            </div>
          </footer>
        ) : null}
      </aside>
    </>
  )
}
