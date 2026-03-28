'use client'

import { useState } from 'react'
import { addToCart, emitCartUpdated } from '@/lib/cart'
import { firstImageFromSources } from '@/lib/catalogMedia'
import { moneyWithSymbol } from '@/lib/money'
import styles from './variant-selector.module.css'

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
  variants: Variant[]
  selectedId?: string
  onSelectVariant?: (variantId: string) => void
}

export default function VariantSelector({
  productId,
  productName,
  variants,
  selectedId,
  onSelectVariant,
}: Props) {
  const defaultVariantId = variants.find((variant) => variant.stock > 0)?.id ?? variants[0]?.id ?? ''
  const [internalSelectedId, setInternalSelectedId] = useState<string>(defaultVariantId)
  const [added, setAdded] = useState(false)

  const resolvedSelectedId = selectedId ?? (variants.some((variant) => variant.id === internalSelectedId) ? internalSelectedId : defaultVariantId)
  const selected = variants.find((v) => v.id === resolvedSelectedId)

  const startingPrice = variants.reduce<number | null>((lowest, variant) => {
    if (!Number.isFinite(variant.price) || variant.price <= 0) return lowest
    if (lowest === null || variant.price < lowest) return variant.price
    return lowest
  }, null)

  const price = selected?.price ?? startingPrice ?? 0
  const compareAtPrice = selected?.compare_at_price ?? null
  const stock = selected?.stock ?? 0
  const inStock = stock > 0
  const canPurchase = Boolean(selected) && inStock
  const stickyVariantLabel = selected ? (selected.name ?? selected.weight ?? 'Selected variant') : 'Select a variant'
  const stickyMetaLine = selected ? `${stickyVariantLabel} · ${moneyWithSymbol(price)}` : stickyVariantLabel

  function handleVariantSelect(variantId: string) {
    if (selectedId == null) {
      setInternalSelectedId(variantId)
    }
    onSelectVariant?.(variantId)
  }

  function handleAdd() {
    if (!canPurchase || !selected) return

    addToCart({
      id: selected.id,
      product_id: productId,
      variant_id: selected.id,
      variant_name: selected.name ?? selected.weight ?? 'Variant',
      name: productName,
      price,
      quantity: 1,
      image: firstImageFromSources(selected.images, selected.image) ?? undefined,
    })
    emitCartUpdated()
    window.dispatchEvent(new Event('cart-open'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.priceRow}>
        <span className={styles.price}>{moneyWithSymbol(price)}</span>
        {compareAtPrice && compareAtPrice > price ? (
          <span className={styles.comparePrice}>{moneyWithSymbol(compareAtPrice)}</span>
        ) : null}
      </div>

      {variants.length > 0 ? (
        <div className={styles.variantBlock}>
          <p className={styles.variantLabel}>Choose Variant</p>
          <div className={styles.variantGrid}>
            {variants.map((variant) => {
              const label = variant.name ?? variant.weight ?? 'Variant'
              const isSelected = variant.id === resolvedSelectedId
              const isOut = variant.stock <= 0
              return (
                <button
                  key={variant.id}
                  type="button"
                  className={`${styles.variantButton} ${isSelected ? styles.variantButtonActive : ''}`}
                  disabled={isOut}
                  onClick={() => handleVariantSelect(variant.id)}
                >
                  <span className={styles.variantName}>{label}</span>
                  <span className={styles.variantPrice}>{moneyWithSymbol(variant.price)}</span>
                  {isOut ? <span className={styles.variantState}>Out of stock</span> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <p className={styles.unavailableText}>
          This product has no available variants.
        </p>
      )}

      <div className={styles.stockRow}>
        {!selected ? (
          <span className={styles.stockHint}>Select a variant to continue</span>
        ) : inStock ? (
          <span className={styles.stockIn}>In stock{stock <= 10 ? ` — only ${stock} left` : ''}</span>
        ) : (
          <span className={styles.stockOut}>Out of stock</span>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={!canPurchase}
        className={`${styles.primaryButton} ${added ? styles.primaryButtonAdded : ''}`}
      >
        {added ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Added to Cart!
          </>
        ) : !selected ? 'Select Variant' : !inStock ? 'Out of Stock' : 'Add to Cart'}
      </button>

      <div className={styles.trustStrip}>
        <span>Certified Product</span>
        <span>No Chemicals</span>
        <span>Quality Assurance</span>
      </div>

      <div className={styles.stickySpacer} aria-hidden="true" />
      <div className={styles.stickyBar}>
        <div className={styles.stickyMeta}>
          <span className={styles.stickyProductName}>{productName}</span>
          <strong>{stickyMetaLine}</strong>
        </div>
        <button type="button" onClick={handleAdd} disabled={!canPurchase} className={styles.stickyButton}>
          {added ? 'Added' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
