'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getCartSnapshot, subscribeToCart, CartItem } from '@/lib/cart'
import { storeConfig } from '@/lib/config'
import { trackEvent } from '@/lib/analytics'
import styles from './header.module.css'

const EMPTY_CART: CartItem[] = []
function getServerSnapshot(): CartItem[] {
  return EMPTY_CART
}

const NAV_ITEMS = [
  { href: '/products', label: 'Shop' },
  { href: '/#story', label: 'Our Story' },
  { href: '/#contact', label: 'Contact' },
] as const

export default function Header() {
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerSnapshot)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  function openCart() {
    setMenuOpen(false)
    window.dispatchEvent(new Event('cart-open-manual'))
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.wrap}>
          <Link
            href="/"
            className={styles.brand}
            aria-label={`${storeConfig.brandName} — home`}
            onClick={() => setMenuOpen(false)}
          >
            <Image
              src={storeConfig.logoUrl}
              alt={storeConfig.brandName}
              width={180}
              height={64}
              priority
              className={styles.brandLogo}
            />
          </Link>

          <nav className={styles.desktopNav}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${item.label === 'Shop' ? styles.navCta : ''}`}
                onClick={() => {
                  if (item.label === 'Shop') {
                    trackEvent('nav_shop_click', { location: 'desktop-header' })
                  }
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.actions}>
            <button
              onClick={openCart}
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
              className={styles.cartButton}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>

              {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
            </button>

            <button
              onClick={() => setMenuOpen(true)}
              className={styles.menuButton}
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className={`${styles.mobileSheet} ${menuOpen ? styles.mobileSheetOpen : ''}`} aria-hidden={!menuOpen}>
        <div className={styles.mobileOverlay} onClick={() => setMenuOpen(false)} />
        <div className={styles.mobilePanel} role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <div className={styles.mobileHeader}>
            <div className={styles.mobileHeaderMeta}>
              <span>{storeConfig.brandName}</span>
              <strong>Natural and certified foods</strong>
            </div>
            <button onClick={() => setMenuOpen(false)} className={styles.menuButton} style={{ display: 'inline-flex' }} aria-label="Close menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <nav className={styles.mobileNav}>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.mobileNavLink} ${item.label === 'Shop' ? styles.mobileNavCta : ''}`}
                onClick={() => {
                  if (item.label === 'Shop') {
                    trackEvent('nav_shop_click', { location: 'mobile-menu' })
                  }
                  setMenuOpen(false)
                }}
              >
                <span>{item.label}</span>
                <span>→</span>
              </Link>
            ))}
            <button onClick={openCart} className={styles.mobileNavLink} style={{ border: 'none', cursor: 'pointer' }}>
              <span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</span>
              <span>→</span>
            </button>
          </nav>

          <div className={styles.mobileFooter}>
            Carefully sourced staples, traditional processing, and secure checkout from {storeConfig.brandName}.
          </div>
        </div>
      </div>
    </>
  )
}

