'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { storeConfig } from '@/lib/config'
import { hasPermission, type UserRole } from '@/lib/server/permissions'
import SignOutButton from '@/app/admin/SignOutButton'

const NAV_ITEMS = [
  {
    href: '/admin',
    permission: 'analytics:read',
    label: 'Dashboard',
    description: 'Store overview',
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
    description: 'Product image library',
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
    href: '/admin/users',
    permission: 'admin-users:manage',
    label: 'Staff access',
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
  { match: /^\/admin\/settings$/, title: 'Settings', subtitle: 'Review the active store configuration and feature settings.' },
  { match: /^\/admin\/settings\/notifications$/, title: 'Notifications', subtitle: 'Edit reusable email and WhatsApp message templates.' },
  { match: /^\/admin\/users$/, title: 'Users', subtitle: 'Manage admin users, roles and sessions.' },
]

export default function AdminChrome({ children, role, singlePassword, testPayments }: { children: React.ReactNode; role: UserRole; singlePassword: boolean; testPayments: boolean }) {
  const pathname = usePathname() ?? '/admin'
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
          {NAV_ITEMS.filter((item) => hasPermission(role, item.permission) && !(singlePassword && item.href === '/admin/users')).map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav__link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? "page" : undefined}
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
            <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-button admin-button--secondary admin-button--small">View store ↗</Link>
            <span className="admin-accessLabel">{singlePassword ? 'Store administrator' : role.replaceAll('_', ' ')}</span>

            <SignOutButton className="admin-signoutButton" />
          </div>
        </header>

        <div className="admin-page">{testPayments ? <div className="admin-testNotice" role="status"><strong>Test payments enabled</strong><span>Orders here may be tests. Review products, prices and stock before switching to live payments.</span></div> : null}{children}</div>
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

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m19 13.5 1.4 1.1-1.7 3-1.7-.7a7.2 7.2 0 0 1-1.8 1l-.3 1.8h-3.5l-.3-1.8a7.2 7.2 0 0 1-1.8-1l-1.7.7-1.7-3L5 13.5a7.5 7.5 0 0 1 0-2l-1.4-1.1 1.7-3 1.7.7a7.2 7.2 0 0 1 1.8-1l.3-1.8h3.5l.3 1.8a7.2 7.2 0 0 1 1.8 1l1.7-.7 1.7 3L19 11.5a7.5 7.5 0 0 1 0 2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
