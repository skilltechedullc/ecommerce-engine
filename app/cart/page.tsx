'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { getCartSnapshot, removeFromCart, updateQuantity, subscribeToCart, emitCartUpdated, CartItem } from '@/lib/cart'
import { storeConfig } from '@/lib/config'
import { moneyWithSymbol } from '@/lib/money'
import { calculateShippingRate } from '@/lib/shipping/rates'
import { buildTenantWhatsAppUrl, tenantConfig } from '@/lib/tenant.config'
import styles from './cart.module.css'

const EMPTY_CART: CartItem[] = []
function getServerSnapshot(): CartItem[] {
  return EMPTY_CART
}

type UpsellProduct = {
  id: string
  name: string
  slug: string
  image: string | null
  price: number | null
  category: string | null
}

export default function CartPage() {
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerSnapshot)
  const [upsellProducts, setUpsellProducts] = useState<UpsellProduct[]>([])
  const whatsAppNumber = tenantConfig.contact.whatsappNumber

  const handleRemove = (id: string) => {
    removeFromCart(id)
    emitCartUpdated()
  }

  const handleQuantityChange = (id: string, current: number, delta: number) => {
    const nextQuantity = Math.max(1, current + delta)
    updateQuantity(id, nextQuantity)
    emitCartUpdated()
  }

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingQuote = calculateShippingRate(total)
  const cartProductIds = useMemo(() => new Set(cart.map((item) => item.product_id)), [cart])

  useEffect(() => {
    let cancelled = false

    async function loadUpsell() {
      const response = await fetch('/api/products/best-sellers?limit=8', { cache: 'no-store' })
      if (!response.ok) return

      const json = await response.json() as { products?: UpsellProduct[] }
      const data = json.products ?? []

      if (cancelled) return

      const picks = data
        .filter((product) => !cartProductIds.has(String(product.id)))
        .slice(0, 2)

      setUpsellProducts(picks)
    }

    void loadUpsell()
    return () => {
      cancelled = true
    }
  }, [cartProductIds])

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroCard}>
            <span className={styles.kicker}>Cart Review</span>
            <h1>Review your selection before we pack and dispatch it fresh.</h1>
            <p>
              Each order is prepared with the same careful sourcing standards that define {storeConfig.brandName}. Check your variants, quantities, and totals before moving to secure checkout.
            </p>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <strong>{itemCount}</strong>
                <span>Items in cart</span>
              </div>
              <div className={styles.heroStat}>
                <strong>{tenantConfig.marketing.cart.shippingLabel}</strong>
                <span>{tenantConfig.region.shippingCoverageLabel}</span>
              </div>
              <div className={styles.heroStat}>
                <strong>{moneyWithSymbol(shippingQuote.total)}</strong>
                <span>Current cart value</span>
              </div>
            </div>
          </div>

          <aside className={styles.miniBrand}>
            <div className={styles.logoRow}>
              <Image
                src={storeConfig.logoUrl}
                alt={storeConfig.brandName}
                width={82}
                height={82}
                unoptimized
                style={{ width: '82px', height: 'auto' }}
              />
              <div className={styles.logoMeta}>
                <span>{storeConfig.brandName}</span>
                <strong>{tenantConfig.marketing.cart.miniBrandTitle}</strong>
              </div>
            </div>
            <p>
              {tenantConfig.marketing.cart.miniBrandBody}
            </p>
            <div className={styles.pills}>
              {tenantConfig.marketing.cart.miniBrandPills.map((pill) => (
                <span key={pill} className={styles.pill}>{pill}</span>
              ))}
            </div>
          </aside>
        </section>

        {cart.length === 0 ? (
          <section className={styles.emptyCard}>
            <div className={styles.emptyIcon}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#12412e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <span className={styles.kicker}>Basket Empty</span>
            <h2>Nothing selected yet.</h2>
            <p>Browse the collection and add staples that match your kitchen routine.</p>
            <Link href="/products" className={styles.primaryButton}>
              Explore Products
            </Link>
          </section>
        ) : (
          <section className={styles.body}>
            <div className={styles.itemsCard}>
              {cart.map((item) => (
                <article key={item.id} className={styles.itemRow}>
                  <div className={styles.imageWrap}>
                    {item.image ? (
                      <Image src={item.image} alt={item.name} fill className={styles.image} sizes="92px" />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className={styles.itemName}>{item.name}</div>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemMetaPill}>{item.variant_name}</span>
                      <span>{moneyWithSymbol(item.price)} each</span>
                    </div>
                    <div className={styles.itemActions}>
                      <div className={styles.qtyControl} role="group" aria-label={`Quantity controls for ${item.name}`}>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, item.quantity, -1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          -
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.id, item.quantity, 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <button onClick={() => handleRemove(item.id)} className={styles.removeButton}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className={styles.priceCol}>
                    <div className={styles.linePrice}>{moneyWithSymbol(item.price * item.quantity)}</div>
                  </div>
                </article>
              ))}
            </div>

            <aside className={styles.summaryCard}>
              <span className={styles.kicker}>Order Summary</span>
              <h2>Ready for checkout</h2>
              <div className={styles.summaryRows}>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <strong>{moneyWithSymbol(total)}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>Shipping</span>
                  <strong>{shippingQuote.shippingAmount > 0 ? moneyWithSymbol(shippingQuote.shippingAmount) : 'Free'}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>{tenantConfig.marketing.cart.fulfilmentLabel}</span>
                  <strong>{tenantConfig.marketing.cart.fulfilmentValue}</strong>
                </div>
              </div>
              <div className={styles.divider} />
              <div className={styles.totalRow}>
                <span>Total</span>
                <span>{moneyWithSymbol(shippingQuote.total)}</span>
              </div>

              <p className={styles.urgencyNote}>Items are not reserved until checkout.</p>

              <Link href="/checkout" className={styles.primaryButton}>
                Continue to Secure Checkout
              </Link>

              <div className={styles.trustStrip} aria-label="Checkout trust indicators">
                <span>Secure payment</span>
                <span>Certified products</span>
                <span>Fast delivery</span>
              </div>

              <Link href="/products" className={styles.secondaryButton}>
                Continue Shopping
              </Link>
              {whatsAppNumber ? (
                <a
                  href={buildTenantWhatsAppUrl(`Hi ${storeConfig.brandName}, ${tenantConfig.marketing.whatsapp.cartHelpMessage}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whatsAppLink}
                >
                  Order via WhatsApp
                </a>
              ) : null}
              <p className={styles.summaryNote}>{tenantConfig.marketing.cart.summaryNote}</p>
            </aside>
          </section>
        )}

        {cart.length > 0 && upsellProducts.length > 0 ? (
          <section className={styles.upsellSection}>
            <div className={styles.upsellHead}>
              <h2>You may also like</h2>
              <Link href="/products">View more</Link>
            </div>
            <div className={styles.upsellGrid}>
              {upsellProducts.map((product) => (
                <article key={product.id} className={styles.upsellCard}>
                  <Link href={`/products/${product.slug}`} className={styles.upsellMedia}>
                    {product.image ? (
                      <Image src={product.image} alt={product.name} fill unoptimized className={styles.upsellImage} sizes="220px" />
                    ) : (
                      <div className={styles.upsellPlaceholder}>No image</div>
                    )}
                  </Link>
                  <div className={styles.upsellBody}>
                    <p>{product.category ?? 'Natural Product'}</p>
                    <h3>{product.name}</h3>
                    <strong>{moneyWithSymbol(Number(product.price ?? 0))}</strong>
                    <Link href={`/products/${product.slug}`} className={styles.upsellButton}>Buy Now</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {cart.length > 0 ? (
          <div className={styles.mobileStickyCheckout}>
            <div className={styles.mobileStickyMeta}>
              <span>{itemCount} item{itemCount === 1 ? '' : 's'}</span>
              <strong>{moneyWithSymbol(shippingQuote.total)}</strong>
            </div>
            <Link href="/checkout" className={styles.mobileStickyButton}>
              Continue to Secure Checkout
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
