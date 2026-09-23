'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { storeConfig } from '@/lib/config'
import { hasPermission, type UserRole } from '@/lib/server/permissions'
import SignOutButton from '@/app/admin/SignOutButton'

const NAV_ITEMS = [
  {
    href: '/admin',
    permission: 'analytics:read',
    label: 'Dashboard',
    description: 'Overview and revenue',
    icon: DashboardIcon,
  },
  {
    href: '/admin/orders',
    permission: 'orders:list',
    label: 'Orders',
    description: 'Track fulfillment',
    icon: OrdersIcon,
  },
  {
    href: '/admin/products',
    permission: 'products:list',
    label: 'Products',
    description: 'Catalog management',
    icon: ProductsIcon,
  },
  {
    href: '/admin/categories',
    permission: 'catalog:categories',
    label: 'Categories',
    description: 'Catalog structure',
    icon: ProductsIcon,
  },
  {
    href: '/admin/inventory',
    permission: 'inventory:read',
    label: 'Inventory',
    description: 'Stock history',
    icon: ProductsIcon,
  },
  {
    href: '/admin/media',
    permission: 'media:manage',
    label: 'Media',
    description: 'Images and banners',
    icon: ProductsIcon,
  },
  {
    href: '/admin/settings',
    permission: 'settings:read',
    label: 'Settings',
    description: 'Store configuration',
    icon: SettingsIcon,
  },
  {
    href: '/admin/launch',
    permission: 'settings:update',
    label: 'Launch',
    description: 'Client setup flow',
    icon: LaunchIcon,
  },
  {
    href: '/admin/users',
    permission: 'admin-users:manage',
    label: 'Users',
    description: 'Roles and access',
    icon: SettingsIcon,
  },
] as const

const PAGE_TITLES: Array<{ match: RegExp; title: string; subtitle: string }> = [
  { match: /^\/admin$/, title: 'Dashboard', subtitle: 'Monitor your store performance at a glance.' },
  { match: /^\/admin\/orders$/, title: 'Orders', subtitle: 'Track payments, fulfillment, and recent activity.' },
  { match: /^\/admin\/orders\//, title: 'Order Detail', subtitle: 'Review customer details and update fulfillment status.' },
  { match: /^\/admin\/products$/, title: 'Products', subtitle: 'Manage your catalog, stock, and publishing state.' },
  { match: /^\/admin\/products\/new$/, title: 'Create Product', subtitle: 'Add a new product with polished merchandising details.' },
  { match: /^\/admin\/products\//, title: 'Edit Product', subtitle: 'Refine product details, media, and variants.' },
  { match: /^\/admin\/categories$/, title: 'Categories', subtitle: 'Manage reusable categories and subcategories.' },
  { match: /^\/admin\/inventory$/, title: 'Inventory', subtitle: 'Review stock changes and inventory adjustments.' },
  { match: /^\/admin\/media$/, title: 'Media', subtitle: 'Review uploaded product and storefront assets.' },
  { match: /^\/admin\/settings$/, title: 'Settings', subtitle: 'Review the active store configuration and launch flags.' },
  { match: /^\/admin\/settings\/notifications$/, title: 'Notifications', subtitle: 'Edit reusable email and WhatsApp message templates.' },
  { match: /^\/admin\/launch$/, title: 'Launch', subtitle: 'Walk through the client-owned store setup flow.' },
  { match: /^\/admin\/users$/, title: 'Users', subtitle: 'Manage admin users, roles and sessions.' },
]

export default function AdminChrome({ children, role }: { children: React.ReactNode; role: UserRole }) {
  const pathname = usePathname() ?? '/admin'
  const router = useRouter()
  const [query, setQuery] = useState('')
  const workspaceHost = (process.env.NEXT_PUBLIC_SITE_URL ?? storeConfig.siteUrl).replace(/^https?:\/\//, '')

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
              <p className="admin-sidebar__subtitle">Store management</p>
            </div>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV_ITEMS.filter((item) => hasPermission(role, item.permission)).map((item) => {
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
          <p className="admin-sidebar__footerValue">{workspaceHost}</p>
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m19 13.5 1.4 1.1-1.7 3-1.7-.7a7.2 7.2 0 0 1-1.8 1l-.3 1.8h-3.5l-.3-1.8a7.2 7.2 0 0 1-1.8-1l-1.7.7-1.7-3L5 13.5a7.5 7.5 0 0 1 0-2l-1.4-1.1 1.7-3 1.7.7a7.2 7.2 0 0 1 1.8-1l.3-1.8h3.5l.3 1.8a7.2 7.2 0 0 1 1.8 1l1.7-.7 1.7 3L19 11.5a7.5 7.5 0 0 1 0 2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

function LaunchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3c3.2 1.8 5.2 4.8 5.2 8.4v1.2l2 2v3l-3.1-1.2A8.2 8.2 0 0 1 12 18a8.2 8.2 0 0 1-4.1-1.6L4.8 17.6v-3l2-2v-1.2C6.8 7.8 8.8 4.8 12 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 9.2v3.2M9.8 21h4.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
