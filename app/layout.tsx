import type { Metadata } from 'next'
import { Geist, Playfair_Display } from 'next/font/google'
import './globals.css'
import RouteChrome from '@/components/RouteChrome'
import { storeConfig } from '@/lib/config'
import { tenantConfig } from '@/lib/tenant.config'

const geistSans = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
})

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  metadataBase: new URL(storeConfig.siteUrl),
  icons: {
    icon: storeConfig.logoUrl,
    shortcut: storeConfig.logoUrl,
    apple: storeConfig.logoUrl,
  },
  title: {
    default: `${storeConfig.brandName} — Storefront`,
    template: `%s — ${storeConfig.brandName}`,
  },
  description: tenantConfig.branding.description,
  keywords: [
    storeConfig.brandName,
    'online store',
    'ecommerce',
  ],
  openGraph: {
    siteName: storeConfig.brandName,
    locale: tenantConfig.region.locale,
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const tenantCssVariables = {
    '--tenant-primary': tenantConfig.branding.colors.primary,
    '--tenant-primary-dark': tenantConfig.branding.colors.primaryDark,
    '--tenant-primary-gradient-start': tenantConfig.branding.colors.primaryGradientStart,
    '--tenant-primary-gradient-end': tenantConfig.branding.colors.primaryGradientEnd,
    '--tenant-accent': tenantConfig.branding.colors.accent,
    '--tenant-background': tenantConfig.branding.colors.background,
    '--tenant-foreground': tenantConfig.branding.colors.foreground,
    '--tenant-surface': tenantConfig.branding.colors.surface,
    '--tenant-whatsapp': tenantConfig.branding.colors.whatsApp,
    '--tenant-admin-accent': tenantConfig.branding.colors.adminAccent,
    '--tenant-admin-sidebar-start': tenantConfig.branding.colors.adminSidebarGradientStart,
    '--tenant-admin-sidebar-end': tenantConfig.branding.colors.adminSidebarGradientEnd,
  } as React.CSSProperties

  return (
    <html lang="en" className={`${geistSans.variable} ${playfair.variable}`}>
      <body
        style={{
          ...tenantCssVariables,
          fontFamily:
            'var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: tenantConfig.branding.colors.background,
          color: tenantConfig.branding.colors.foreground,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <RouteChrome>{children}</RouteChrome>
      </body>
    </html>
  )
}

