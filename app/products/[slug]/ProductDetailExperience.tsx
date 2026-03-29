'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { tenantConfig } from '@/lib/tenant.config'
import VariantSelector from './VariantSelector'
import styles from './product-detail.module.css'

type Variant = {
  id: string
  product_id: string
  name?: string | null
  weight?: string | null
  price: number
  compare_at_price?: number | null
  stock: number
  sku?: string | null
  image?: string | null
  images?: string[]
}

type Props = {
  productId: string
  productName: string
  productCategory?: string | null
  productSubcategory?: string | null
  productDescription?: string | null
  productGallery: string[]
  variants: Variant[]
  logoUrl: string
  brandName: string
}

export default function ProductDetailExperience({
  productId,
  productName,
  productCategory,
  productSubcategory,
  productDescription,
  productGallery,
  variants,
  logoUrl,
  brandName,
}: Props) {
  const defaultVariantId = variants.find((variant) => variant.stock > 0)?.id ?? variants[0]?.id ?? ''
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariantId)
  const [activeImage, setActiveImage] = useState<string | null>(productGallery[0] ?? null)

  useEffect(() => {
    setSelectedVariantId(defaultVariantId)
  }, [defaultVariantId])

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId)
  const selectedVariantGallery = selectedVariant?.images ?? []
  const activeGallery = selectedVariantGallery.length > 0 ? selectedVariantGallery : productGallery

  useEffect(() => {
    setActiveImage(activeGallery[0] ?? null)
  }, [selectedVariantId, activeGallery])

  const displayImage = useMemo(() => {
    if (!activeImage) return activeGallery[0] ?? null
    return activeGallery.includes(activeImage) ? activeImage : activeGallery[0] ?? null
  }, [activeGallery, activeImage])

  return (
    <div className={styles.mainWrap}>
      <div className={styles.galleryCard}>
        <div className={styles.galleryImageWrap}>
          {displayImage ? (
            <Image src={displayImage} alt={productName} fill unoptimized className={styles.galleryImage} />
          ) : (
            <div className={styles.imagePlaceholder}>
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#7a9285" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>
        {activeGallery.length > 1 ? (
          <div className={styles.galleryThumbStrip}>
            {activeGallery.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                className={`${styles.galleryThumb} ${url === displayImage ? styles.galleryThumbActive : ''}`}
                onClick={() => setActiveImage(url)}
              >
                <Image src={url} alt={`${productName} ${index + 1}`} fill unoptimized className={styles.galleryThumbImage} />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.summaryColumn}>
        <section className={styles.summaryCard}>
          <div className={styles.brandRow}>
            <div className={styles.brandMark}>
              <Image src={logoUrl} alt={brandName} width={46} height={46} unoptimized />
            </div>
            <div className={styles.brandMeta}>
              <span>Certified Brand</span>
              <strong>{brandName}</strong>
            </div>
          </div>

          {productCategory && (
            <p className={styles.category}>
              {productCategory}{productSubcategory ? ` · ${productSubcategory}` : ''}
            </p>
          )}

          <h1>{productName}</h1>

          {productDescription && <p className={styles.description}>{productDescription}</p>}

          <div className={styles.benefitList}>
            {tenantConfig.marketing.productDetail.benefits.map((benefit) => (
              <span key={benefit}>{benefit}</span>
            ))}
          </div>

          <VariantSelector
            productId={productId}
            productName={productName}
            variants={variants}
            selectedId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
          />
        </section>

        <section className={styles.trustCard}>
          <h2>{tenantConfig.marketing.productDetail.trustHeading}</h2>
          <div className={styles.trustList}>
            {[...tenantConfig.marketing.productDetail.trustItems, `Carefully packed by ${brandName}`].map((text) => (
              <div key={text} className={styles.trustItem}>
                <span className={styles.trustItemDot}>✓</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}