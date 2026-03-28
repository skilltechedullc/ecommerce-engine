'use client'

import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import MiniCartDrawer from '@/components/MiniCartDrawer'

export default function RouteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin') ?? false
  const hideWhatsAppFloat = pathname === '/checkout' || pathname === '/cart'

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <>
      <Header />
      <MiniCartDrawer />
      {!hideWhatsAppFloat && <WhatsAppButton />}
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </>
  )
}