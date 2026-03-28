'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

type TrackedLinkProps = {
  href: string
  className?: string
  children: ReactNode
  eventName: string
  eventData?: Record<string, string | number | boolean | null | undefined>
}

export default function TrackedLink({
  href,
  className,
  children,
  eventName,
  eventData,
}: TrackedLinkProps) {
  function handleClick() {
    trackEvent(eventName, {
      href,
      ...(eventData ?? {}),
    })
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
