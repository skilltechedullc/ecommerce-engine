'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState, type MouseEvent } from 'react'
import { addToCart, emitCartUpdated } from '@/lib/cart'
import { moneyWithSymbol } from '@/lib/money'
import styles from './ProductCard.module.css'

export type Product = {
  id: string
  name: string
  slug: string
  price?: number | null
  stock?: number | null
  description?: string
  image?: string | null
  category?: string | null
  product_variants?: Array<{ id?: string | null; name?: string | null; weight?: string | null; price: number | null; compare_at_price?: number | null; stock?: number | null }>
}

function getProductTone(category?: string | null) {
  const value = (category ?? '').toLowerCase()

  if (value.includes('spice') || value.includes('masala')) return 'spice'
  if (value.includes('oil')) return 'oil'
  if (value.includes('honey') || value.includes('sweet')) return 'sweet'
  if (value.includes('pickle') || value.includes('condiment')) return 'pickle'
  if (value.includes('rice') || value.includes('flour') || value.includes('breakfast')) return 'grain'
  if (value.includes('coconut')) return 'coconut'
  return 'natural'
}

export default function ProductCard({
  product,
  isBestSeller = false,
}: {
  product: Product
  isBestSeller?: boolean
}) {
  const router = useRouter()
  const [added, setAdded] = useState(false)

  const variants = (product.product_variants ?? [])
    .map((variant) => ({
      id: variant.id ?? '',
      name: variant.name ?? variant.weight ?? 'Default',
      price: Number(variant.price ?? 0),
      compareAtPrice: Number(variant.compare_at_price ?? 0),
      stock: Number(variant.stock ?? 0),
    }))
    .filter((variant) => Number.isFinite(variant.price) && variant.price > 0)

  const cheapestVariant = variants.reduce<{ id: string; name: string; price: number; compareAtPrice: number; stock: number } | null>((lowest, variant) => {
    if (!lowest || variant.price < lowest.price) return variant
    return lowest
  }, null)

  const inStockVariants = variants.filter((variant) => variant.stock > 0)
  const cheapestInStockVariant = inStockVariants.reduce<{ id: string; name: string; price: number; compareAtPrice: number; stock: number } | null>((lowest, variant) => {
    if (!lowest || variant.price < lowest.price) return variant
    return lowest
  }, null)

  const displayVariant = cheapestInStockVariant ?? cheapestVariant
  const bestVariantForAdd = displayVariant?.id ? displayVariant : null

  const displayPrice = displayVariant?.price ?? Number(product.price ?? 0)
  const compareAtPrice = displayVariant && displayVariant.compareAtPrice > displayPrice
    ? displayVariant.compareAtPrice
    : null
  const stock = displayVariant?.stock ?? Number(product.stock ?? 0)
  const isLowStock = Number.isFinite(stock) && stock > 0 && stock <= 10
  const inStock = Boolean(displayVariant) ? stock > 0 : Number.isFinite(stock) ? stock > 0 : true
  const placeholderTone = getProductTone(product.category)

  function triggerQuickAdd() {
    if (!inStock || displayPrice <= 0) return

    // If no real variant ID is available, navigate to the product page instead
    if (!bestVariantForAdd?.id) {
      router.push(`/products/${product.slug}`)
      return
    }

    addToCart({
      id: bestVariantForAdd.id,
      product_id: product.id,
      variant_id: bestVariantForAdd.id,
      variant_name: bestVariantForAdd.name,
      name: product.name,
      price: bestVariantForAdd.price,
      quantity: 1,
    })

    emitCartUpdated()
    window.dispatchEvent(new Event('cart-open'))
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1500)
  }

  function handleQuickAdd(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    triggerQuickAdd()
  }

  return (
    <article className={styles.card}>
      <Link href={`/products/${product.slug}`} className={styles.cardLink}>
        <div className={styles.media}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              unoptimized
              className={styles.image}
            />
          ) : (
            <div className={styles.placeholderArt} data-tone={placeholderTone} aria-hidden="true">
              <div className={styles.placeholderPack}>
                <span className={styles.placeholderBrand}>millco</span>
                <strong>{product.name}</strong>
                <span>{product.category ?? 'Natural Foods'}</span>
              </div>
            </div>
          )}
          {product.category ? <span className={styles.category}>{product.category}</span> : null}
          {isBestSeller ? <span className={styles.bestSellerBadge}>Best Seller</span> : null}
          {isLowStock ? <span className={styles.lowStockBadge}>Only {stock} left</span> : null}
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>{product.name}</h2>

          {product.description ? <p className={styles.description}>{product.description}</p> : null}

          <div className={styles.footer}>
            <div>
              <p className={styles.priceLabel}>Starting at</p>
              <div className={styles.priceWrap}>
                <span className={styles.price}>{moneyWithSymbol(displayPrice)}</span>
                {compareAtPrice ? <span className={styles.comparePrice}>{moneyWithSymbol(compareAtPrice)}</span> : null}
              </div>
            </div>

            <span className={styles.detailCta}>View Details</span>
          </div>
        </div>
      </Link>

      <div className={styles.quickActions}>
        <button
          type="button"
          className={styles.quickAddButton}
          onClick={handleQuickAdd}
          disabled={!inStock || displayPrice <= 0}
          aria-label={`Add ${product.name} to cart`}
        >
          {added ? 'Added' : inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </article>
  )
}
