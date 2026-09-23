'use client'

import { useDeferredValue, useMemo, useRef, useState } from 'react'
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
  product_variants: Array<{ price: number | null; compare_at_price: number | null; stock: number | null; image?: string | string[] | null; weight?: string | null }>
}

export default function ProductsClient({ products }: { products: ProductRecord[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [category, setCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-desc'>('newest')
  const [denseMode, setDenseMode] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState('')
  const [importError, setImportError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkStatus, setBulkStatus] = useState<'keep' | 'active' | 'inactive'>('keep')
  const [bulkStockMode, setBulkStockMode] = useState<'none' | 'set' | 'increase' | 'decrease'>('none')
  const [bulkStockValue, setBulkStockValue] = useState(0)
  const [bulkSaving, setBulkSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
  const hasProducts = products.length > 0
  const visibleIds = filteredProducts.map((product) => product.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  function clearFilters() {
    setQuery('')
    setStatus('all')
    setCategory('all')
    setSortBy('newest')
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportMessage('')
    setImportError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/admin/import/products', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import failed')

      const importedCount = Number(data.importedCount ?? data.data?.importedCount ?? 0)
      setImportMessage(`Imported ${importedCount} product${importedCount === 1 ? '' : 's'}.`)
      router.refresh()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function toggleProductSelection(id: string) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id])
  }

  function toggleVisibleSelection() {
    setSelectedIds((current) => {
      if (allVisibleSelected) return current.filter((id) => !visibleIds.includes(id))
      return Array.from(new Set([...current, ...visibleIds]))
    })
  }

  async function applyBulkUpdate() {
    if (selectedIds.length === 0) return
    setBulkSaving(true)
    setImportError('')
    setImportMessage('')

    try {
      const patch: Record<string, unknown> = {}
      if (bulkCategory.trim()) patch.category = bulkCategory.trim()
      if (bulkStatus !== 'keep') patch.is_active = bulkStatus === 'active'
      if (bulkStockMode !== 'none') {
        patch.stockMode = bulkStockMode
        patch.stockValue = bulkStockValue
      }

      const response = await fetch('/api/admin/products/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds, patch }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Bulk update failed')

      const updatedCount = Number(data.updatedCount ?? data.data?.updatedCount ?? selectedIds.length)
      setImportMessage(`Updated ${updatedCount} product${updatedCount === 1 ? '' : 's'}.`)
      setSelectedIds([])
      router.refresh()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Bulk update failed')
    } finally {
      setBulkSaving(false)
    }
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
            <a href="/api/admin/exports/products" className="admin-button admin-button--secondary">
              Export CSV
            </a>
            <label className={`admin-button admin-button--secondary${importing ? ' is-disabled' : ''}`}>
              {importing ? 'Importing...' : 'Import CSV/XLSX'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleImportFile}
                disabled={importing}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
        <p className="admin-sectionText" style={{ marginTop: '-2px' }}>
          {filteredProducts.length} products shown. Tip: click any row to edit faster.
        </p>
        {importMessage ? <p className="admin-inlineMessage admin-inlineMessage--success">{importMessage}</p> : null}
        {importError ? <p className="admin-inlineMessage admin-inlineMessage--error">{importError}</p> : null}
      </section>

      {selectedIds.length > 0 ? (
        <section className="admin-surface admin-toolbarCard">
          <div>
            <p className="admin-sectionEyebrow">Bulk edit</p>
            <h2 className="admin-sectionTitle">{selectedIds.length} selected</h2>
            <p className="admin-sectionText">Apply status, category, or stock changes to selected products.</p>
          </div>
          <div className="admin-filterGrid">
            <label className="admin-inputShell admin-inputShell--compact">
              <span className="admin-inputShell__label">Category</span>
              <input value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)} placeholder="Leave blank to keep" />
            </label>
            <label className="admin-inputShell admin-inputShell--compact">
              <span className="admin-inputShell__label">Status</span>
              <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as 'keep' | 'active' | 'inactive')}>
                <option value="keep">Keep current</option>
                <option value="active">Set active</option>
                <option value="inactive">Set inactive</option>
              </select>
            </label>
            <label className="admin-inputShell admin-inputShell--compact">
              <span className="admin-inputShell__label">Stock mode</span>
              <select value={bulkStockMode} onChange={(event) => setBulkStockMode(event.target.value as 'none' | 'set' | 'increase' | 'decrease')}>
                <option value="none">No stock change</option>
                <option value="set">Set stock</option>
                <option value="increase">Increase stock</option>
                <option value="decrease">Decrease stock</option>
              </select>
            </label>
            <label className="admin-inputShell admin-inputShell--compact">
              <span className="admin-inputShell__label">Stock value</span>
              <input type="number" min="0" value={bulkStockValue} onChange={(event) => setBulkStockValue(Number(event.target.value))} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="admin-button admin-button--secondary" onClick={() => setSelectedIds([])}>
              Clear Selection
            </button>
            <button type="button" className="admin-button admin-button--primary" onClick={applyBulkUpdate} disabled={bulkSaving}>
              {bulkSaving ? 'Applying...' : 'Apply Bulk Update'}
            </button>
          </div>
        </section>
      ) : null}

      <section className="admin-surface admin-tableCard">
        {filteredProducts.length === 0 ? (
          <div className="admin-emptyState">
            <div className="admin-emptyState__icon">◎</div>
            <h3>{hasProducts ? 'No products match these filters' : 'No products yet'}</h3>
            <p>
              {hasProducts
                ? 'Adjust the search or filters, or add a new product to grow your catalog.'
                : 'Add your first product with at least one variant, price, stock count, and product image.'}
            </p>
            {!hasProducts ? (
              <Link href="/admin/products/new" className="admin-button admin-button--primary" style={{ marginTop: '14px' }}>
                Add First Product
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="admin-tableWrap">
            <table className={`admin-table${denseMode ? ' admin-table--compact' : ''}`}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleVisibleSelection}
                      aria-label="Select all visible products"
                    />
                  </th>
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
                  const isOutOfStock = totalStock === 0
                  const isLowStock = totalStock <= 10 && totalStock > 0
                  const stockTone = isOutOfStock ? 'critical' : isLowStock ? 'warning' : 'positive'

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
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleProductSelection(product.id)}
                          aria-label={`Select ${product.name}`}
                        />
                      </td>
                      <td>{product.category ?? 'Uncategorized'}</td>
                      <td>
                        <span className={`admin-badge ${product.is_active ? 'admin-badge--success' : 'admin-badge--neutral'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`admin-stockPill admin-stockPill--${stockTone}`}>
                            {totalStock} stock
                          </span>
                          {isLowStock ? (
                            <span className="admin-badge admin-badge--warning">Low stock</span>
                          ) : null}
                          {isOutOfStock ? (
                            <span className="admin-badge admin-badge--danger">Out of stock</span>
                          ) : null}
                        </div>
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
