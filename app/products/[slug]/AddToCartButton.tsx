'use client'

import { useState } from 'react'
import { addToCart, emitCartUpdated } from '@/lib/cart'
import { moneyWithSymbol } from '@/lib/money'

type Variant = {
  id: string
  product_id: string
  weight: string
  price: number
  stock: number
  sku?: string
}

type Product = {
  id: string
  name: string
  description?: string
  price?: number
  stock?: number
  category?: string
  subcategory?: string
  sku?: string
  image?: string
}

export default function AddToCartButton({
  product,
  variants,
}: {
  product: Product
  variants: Variant[]
}) {
  const hasVariants = variants.length > 0
  const defaultVariant = variants.find((variant) => variant.stock > 0) ?? variants[0]

  const [selectedId, setSelectedId] = useState<string>(
    hasVariants ? defaultVariant?.id ?? '' : ''
  )
  const [added, setAdded] = useState(false)

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? defaultVariant

  // Resolved price and stock depending on variant or product-level fallback
  const displayPrice = hasVariants
    ? (selectedVariant?.price ?? 0)
    : (product.price ?? 0)

  const displayStock = hasVariants
    ? (selectedVariant?.stock ?? 0)
    : (product.stock ?? 0)

  const inStock = displayStock > 0

  const handleAdd = () => {
    addToCart({
      id: hasVariants ? selectedVariant!.id : product.id,
      product_id: product.id,
      variant_id: hasVariants ? selectedVariant!.id : product.id,
      variant_name: hasVariants ? selectedVariant?.weight ?? 'Default' : 'Default',
      name: product.name,
      price: displayPrice,
      quantity: 1,
    })
    emitCartUpdated()
    window.dispatchEvent(new Event('cart-open'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div style={{ paddingTop: '4px' }}>
      {/* Category label */}
      {product.category && (
        <p
          style={{
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#C9A84C',
            margin: '0 0 16px',
          }}
        >
          {product.category}
          {product.subcategory ? ` · ${product.subcategory}` : ''}
        </p>
      )}

      {/* Product name */}
      <h1
        style={{
          fontFamily: 'var(--font-playfair), Georgia, serif',
          fontSize: '36px',
          fontWeight: '700',
          color: '#1C1C1C',
          lineHeight: '1.2',
          letterSpacing: '-0.5px',
          margin: '0 0 20px',
        }}
      >
        {product.name}
      </h1>

      {/* Price */}
      <div
        style={{
          fontSize: '30px',
          fontWeight: '700',
          color: '#1B4332',
          margin: '0 0 24px',
          fontFamily: 'var(--font-playfair), Georgia, serif',
        }}
      >
        {moneyWithSymbol(displayPrice)}
      </div>

      {/* Description */}
      {product.description && (
        <p
          style={{
            fontSize: '15px',
            color: '#555',
            lineHeight: '1.8',
            margin: '0 0 32px',
          }}
        >
          {product.description}
        </p>
      )}

      {/* Variant selector */}
      {hasVariants && (
        <div style={{ marginBottom: '28px' }}>
          <label
            htmlFor="variant-select"
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              color: '#6B6B6B',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            Weight
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: v.id === selectedId ? '2px solid #1B4332' : '1.5px solid #DDD',
                  backgroundColor: v.id === selectedId ? '#EDF5EF' : '#FFFFFF',
                  color: v.id === selectedId ? '#1B4332' : '#444',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: v.stock === 0 ? 'not-allowed' : 'pointer',
                  opacity: v.stock === 0 ? 0.45 : 1,
                }}
                disabled={v.stock === 0}
                title={v.stock === 0 ? 'Out of stock' : undefined}
              >
                {v.weight}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock status */}
      <div style={{ marginBottom: '24px' }}>
        {inStock ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#2D6A4F',
              fontWeight: '500',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#2D6A4F',
                flexShrink: 0,
              }}
            />
            In stock
            {displayStock <= 10 && ` — only ${displayStock} left`}
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#B91C1C',
              fontWeight: '500',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#B91C1C',
                flexShrink: 0,
              }}
            />
            Out of stock
          </span>
        )}
      </div>

      {/* Add to cart button */}
      <button
        onClick={handleAdd}
        disabled={!inStock}
        style={{
          width: '100%',
          padding: '16px 24px',
          backgroundColor: !inStock
            ? '#A0AFA8'
            : added
            ? '#2A5C45'
            : '#1B4332',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '12px',
          cursor: !inStock ? 'not-allowed' : 'pointer',
          fontSize: '15px',
          fontWeight: '600',
          letterSpacing: '0.3px',
          transition: 'background 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
        }}
      >
        {added ? (
          <>
            <svg
              width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Added to Cart
          </>
        ) : !inStock ? (
          'Out of Stock'
        ) : (
          'Add to Cart'
        )}
      </button>

      {/* Trust badges */}
      <div
        style={{
          marginTop: '32px',
          paddingTop: '28px',
          borderTop: '1px solid #EDE8DF',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {[
          'FSSAI Certified Quality',
          'Natural & Sulphur-Free',
          'Export Grade Standard',
          'Ships in 2–3 Business Days',
        ].map((text) => (
          <div
            key={text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#555',
            }}
          >
            <svg
              width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="#1B4332" strokeWidth="2.5" strokeLinecap="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}
