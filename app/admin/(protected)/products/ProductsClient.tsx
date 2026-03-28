'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { firstImageFromSources } from '@/lib/catalogMedia'
import { moneyWithSymbol } from '@/lib/money'
import { storeConfig } from '@/lib/config'
import DeleteProductButton from './DeleteProductButton'

type ProductRecord = {
  id: string
  name: string
  slug: string
  image: string | null
  category: string | null
  is_active: boolean
  product_variants: Array<{ price: number | null; compare_at_price: number | null; stock: number | null; image?: string | string[] | null }>
}

export default function ProductsClient({ products }: { products: ProductRecord[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-desc'>('newest')
  const [denseMode, setDenseMode] = useState(false)
  const deferredQuery = useDeferredValue(query)

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category).filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b)))
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    const next = products.filter((product) => {
      const matchesQuery = !normalizedQuery || [product.name, product.slug, product.category ?? '']
        .some((value) => value.toLowerCase().includes(normalizedQuery))
      const matchesStatus = status === 'all'
        || (status === 'active' ? product.is_active : !product.is_active)
      const matchesCategory = category === 'all' || product.category === category

      return matchesQuery && matchesStatus && matchesCategory
    })

    return next.sort((left, right) => {
      const leftPrices = (left.product_variants ?? []).map((variant) => Number(variant.price ?? 0)).filter((value) => Number.isFinite(value))
      const rightPrices = (right.product_variants ?? []).map((variant) => Number(variant.price ?? 0)).filter((value) => Number.isFinite(value))
      const leftStocks = (left.product_variants ?? []).map((variant) => Number(variant.stock ?? 0)).filter((value) => Number.isFinite(value))
      const rightStocks = (right.product_variants ?? []).map((variant) => Number(variant.stock ?? 0)).filter((value) => Number.isFinite(value))
      const leftPrice = leftPrices.length ? Math.min(...leftPrices) : 0
      const rightPrice = rightPrices.length ? Math.min(...rightPrices) : 0
      const leftStock = leftStocks.reduce((sum, value) => sum + value, 0)
      const rightStock = rightStocks.reduce((sum, value) => sum + value, 0)

      switch (sortBy) {
        case 'name-asc':
          return left.name.localeCompare(right.name)
        case 'price-asc':
          return leftPrice - rightPrice
        case 'price-desc':
          return rightPrice - leftPrice
        case 'stock-desc':
          return rightStock - leftStock
        case 'newest':
        default:
          return 0
      }
    })
  }, [category, deferredQuery, products, sortBy, status])

  const hasFilters = Boolean(query.trim()) || status !== 'all' || category !== 'all' || sortBy !== 'newest'

  function clearFilters() {
    setQuery('')
    setStatus('all')
    setCategory('all')
    setSortBy('newest')
  }

  return (
    <div className="admin-stack">
      <section className="admin-surface admin-toolbarCard">
        <div>
          <p className="admin-sectionEyebrow">Catalog</p>
          <h2 className="admin-sectionTitle">Products</h2>
          <p className="admin-sectionText">Search, filter, and manage product availability from one view.</p>
        </div>

        <div className="admin-toolbarCard__actions">
          <div className="admin-filterGrid">
            <label className="admin-inputShell admin-inputShell--compact">
              <span className="admin-inputShell__label">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, slug, or category"
              />
            </label>

            <label className="admin-inputShell admin-inputShell--compact">
              <span className="admin-inputShell__label">Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as 'all' | 'active' | 'inactive')}>
                <option value="all">All products</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="admin-inputShell admin-inputShell--compact">
              <span className="admin-inputShell__label">Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item ?? ''}>{item}</option>
                ))}
              </select>
            </label>

            <label className="admin-inputShell admin-inputShell--compact">
              <span className="admin-inputShell__label">Sort</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'newest' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-desc')}>
                <option value="newest">Newest first</option>
                <option value="name-asc">Name A-Z</option>
                <option value="price-asc">Price low to high</option>
                <option value="price-desc">Price high to low</option>
                <option value="stock-desc">Most stock</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setDenseMode((current) => !current)}
              className="admin-button admin-button--secondary"
            >
              {denseMode ? 'Comforty View' : 'Dense View'}
            </button>
            {hasFilters ? (
              <button type="button" onClick={clearFilters} className="admin-button admin-button--secondary">
                Clear Filters
              </button>
            ) : null}
            <Link href="/admin/products/new" className="admin-button admin-button--primary">
              + New Product
            </Link>
          </div>
        </div>
        <p className="admin-sectionText" style={{ marginTop: '-2px' }}>
          {filteredProducts.length} products shown. Tip: click any row to edit faster.
        </p>
      </section>

      <section className="admin-surface admin-tableCard">
        {filteredProducts.length === 0 ? (
          <div className="admin-emptyState">
            <div className="admin-emptyState__icon">◎</div>
            <h3>No products match these filters</h3>
            <p>Adjust the search or filters, or add a new product to grow your catalog.</p>
          </div>
        ) : (
          <div className="admin-tableWrap">
            <table className={`admin-table${denseMode ? ' admin-table--compact' : ''}`}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Stock</th>
                  <th>Starting Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const prices = (product.product_variants ?? [])
                    .map((variant) => Number(variant.price ?? 0))
                    .filter((value) => Number.isFinite(value))
                  const pricePairs = (product.product_variants ?? [])
                    .map((variant) => ({
                      price: Number(variant.price ?? 0),
                      compareAtPrice: Number(variant.compare_at_price ?? 0),
                    }))
                    .filter((variant) => Number.isFinite(variant.price) && variant.price > 0)
                  const stocks = (product.product_variants ?? [])
                    .map((variant) => Number(variant.stock ?? 0))
                    .filter((value) => Number.isFinite(value))
                  const minPrice = prices.length ? Math.min(...prices) : 0
                  const cheapestVariant = pricePairs.find((variant) => variant.price === minPrice)
                  const compareAtPrice = cheapestVariant && cheapestVariant.compareAtPrice > minPrice ? cheapestVariant.compareAtPrice : null
                  const totalStock = stocks.reduce((sum, value) => sum + value, 0)
                  const thumbnail = firstImageFromSources(
                    product.image,
                    product.product_variants?.map((variant) => variant.image),
                    storeConfig.logoUrl,
                  ) ?? storeConfig.logoUrl
                  const stockTone = totalStock <= 0 ? 'critical' : totalStock < 10 ? 'warning' : 'positive'

                  return (
                    <tr
                      key={product.id}
                      className="admin-tableRowClickable"
                      onClick={() => router.push(`/admin/products/${product.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          router.push(`/admin/products/${product.id}`)
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <div className="admin-tableProduct">
                          <div className="admin-tableProduct__thumbWrap">
                            <Image src={thumbnail} alt={product.name} fill unoptimized className="admin-tableProduct__thumb" />
                          </div>
                          <div>
                            <p className="admin-tableProduct__name">{product.name}</p>
                            <p className="admin-tableProduct__meta">/products/{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td>{product.category ?? 'Uncategorized'}</td>
                      <td>
                        <span className={`admin-badge ${product.is_active ? 'admin-badge--success' : 'admin-badge--neutral'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-stockPill admin-stockPill--${stockTone}`}>
                          {totalStock <= 0 ? 'Out of stock' : `${totalStock} in stock`}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: '2px' }}>
                          <span style={{ color: 'var(--admin-text)', fontWeight: 700 }}>{moneyWithSymbol(minPrice)}</span>
                          {compareAtPrice ? (
                            <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px', textDecoration: 'line-through' }}>
                              {moneyWithSymbol(compareAtPrice)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="admin-rowActions" onClick={(event) => event.stopPropagation()}>
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="admin-button admin-button--secondary admin-button--small"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Edit
                          </Link>
                          <DeleteProductButton id={product.id} name={product.name} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}