'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

type Props = {
  copyVariant: 'trust' | 'urgency'
}

export default function ProductsCopyVariantTracker({ copyVariant }: Props) {
  useEffect(() => {
    trackEvent('products_copy_variant_viewed', { copyVariant })
  }, [copyVariant])

  return null
}
