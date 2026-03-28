'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { storeConfig } from '@/lib/config'
import SignOutButton from '@/app/admin/SignOutButton'

const NAV_ITEMS = [
  {
    href: '/admin',
    label: 'Dashboard',
    description: 'Overview and revenue',
    icon: DashboardIcon,
  },
  {
    href: '/admin/orders',
    label: 'Orders',
    description: 'Track fulfillment',
    icon: OrdersIcon,
  },
  {
    href: '/admin/products',
    label: 'Products',
    description: 'Catalog management',
    icon: ProductsIcon,
  },
] as const

const PAGE_TITLES: Array<{ match: RegExp; title: string; subtitle: string }> = [
  { match: /^\/admin$/, title: 'Dashboard', subtitle: 'Monitor your store performance at a glance.' },
  { match: /^\/admin\/orders$/, title: 'Orders', subtitle: 'Track payments, fulfillment, and recent activity.' },
  { match: /^\/admin\/orders\//, title: 'Order Detail', subtitle: 'Review customer details and update fulfillment status.' },
  { match: /^\/admin\/products$/, title: 'Products', subtitle: 'Manage your catalog, stock, and publishing state.' },
  { match: /^\/admin\/products\/new$/, title: 'Create Product', subtitle: 'Add a new product with polished merchandising details.' },
  { match: /^\/admin\/products\//, title: 'Edit Product', subtitle: 'Refine product details, media, and variants.' },
]

export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/admin'
  const router = useRouter()
  const [query, setQuery] = useState('')

  const pageMeta = useMemo(() => {
    return PAGE_TITLES.find((entry) => entry.match.test(pathname)) ?? PAGE_TITLES[0]
  }, [pathname])

  const initials = storeConfig.brandName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('')

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = query.trim().toLowerCase()
    if (!value) return

    if (value.includes('product') || value.includes('catalog')) {
      router.push('/admin/products')
      return
    }

    if (value.includes('order') || value.includes('payment') || value.includes('ship')) {
      router.push('/admin/orders')
      return
    }

    router.push('/admin')
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <p className="admin-sidebar__eyebrow">{storeConfig.brandName}</p>
          <div className="admin-sidebar__titleRow">
            <div className="admin-sidebar__logoMark">{initials || 'AD'}</div>
            <div>
              <p className="admin-sidebar__title">Commerce Admin</p>
              <p className="admin-sidebar__subtitle">Premium operations hub</p>
            </div>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav__link${isActive ? ' is-active' : ''}`}
              >
                <span className="admin-nav__icon"><Icon /></span>
                <span className="admin-nav__content">
                  <span className="admin-nav__label">{item.label}</span>
                  <span className="admin-nav__description">{item.description}</span>
                </span>
              </Link>
            )
          })}
        </nav>

        <div className="admin-sidebar__footer">
          <p className="admin-sidebar__footerLabel">Workspace</p>
          <p className="admin-sidebar__footerValue">{storeConfig.siteUrl.replace(/^https?:\/\//, '')}</p>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar__eyebrow">Admin Panel</p>
            <h1 className="admin-topbar__title">{pageMeta.title}</h1>
            <p className="admin-topbar__subtitle">{pageMeta.subtitle}</p>
          </div>

          <div className="admin-topbar__actions">
            <form className="admin-search" onSubmit={handleSearchSubmit}>
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Jump to dashboard, orders, or products"
                aria-label="Quick search"
              />
            </form>

            <div className="admin-profileCard">
              <div className="admin-profileCard__avatar">{initials || 'AD'}</div>
              <div className="admin-profileCard__meta">
                <span className="admin-profileCard__name">Admin</span>
                <span className="admin-profileCard__role">Store operator</span>
              </div>
            </div>

            <SignOutButton className="admin-signoutButton" />
          </div>
        </header>

        <div className="admin-page">{children}</div>
      </div>
    </div>
  )
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 13.5h6.5V20H4v-6.5Zm9.5-9.5H20v16h-6.5V4ZM4 4h6.5v6.5H4V4Zm9.5 9.5H20v6.5h-6.5v-6.5Z" fill="currentColor" />
    </svg>
  )
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l5 5v13H6V3Zm8 1.5V9h4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ProductsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 0v18M4 7l8 4 8-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm9 16-4.4-4.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}