import type { Metadata } from 'next'
import { Geist, Playfair_Display } from 'next/font/google'
import './globals.css'
import RouteChrome from '@/components/RouteChrome'
import { storeConfig } from '@/lib/config'

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
  description: `${storeConfig.brandName} online store.`,
  keywords: [
    storeConfig.brandName,
    'online store',
    'ecommerce',
  ],
  openGraph: {
    siteName: storeConfig.brandName,
    locale: 'en_IN',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${playfair.variable}`}>
      <body
        style={{
          fontFamily:
            'var(--font-geist), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: '#F7F5F0',
          color: '#1E1E1E',
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

