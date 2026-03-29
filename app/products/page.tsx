import { supabase } from '@/lib/supabase'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'
import { getBestSellerProductIds } from '@/lib/server/bestSellers'
import ProductsCopyVariantTracker from './ProductsCopyVariantTracker'
import styles from './products.module.css'

type CopyVariantKey = 'trust' | 'urgency'

const COPY_VARIANTS: Record<CopyVariantKey, { title: string; description: string }> = {
  trust: {
    title: 'Browse certified natural foods with premium quality standards.',
    description: 'Certified oils and natural staples crafted for clean everyday cooking.',
  },
  urgency: {
    title: 'Clean essentials for your next kitchen refill.',
    description: 'Natural, chemical-free essentials for your next kitchen refill.',
  },
}

export const metadata = {
  title: 'Shop — Products',
  description: 'Browse our certified natural collection from Kerala.',
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; copy?: string }>
}) {
  const { category, sort, copy } = await searchParams
  const activeCategory = category ?? ''
  const activeSort = sort ?? 'featured'
  const copyVariant: CopyVariantKey = copy === 'trust' ? 'trust' : 'urgency'
  const heroCopy = COPY_VARIANTS[copyVariant]
  const bestSellerProductIds = new Set(await getBestSellerProductIds(12))

  const { data: categoryRows } = await supabase
    .from('products')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)

  const categoryCounts = new Map<string, number>()
  for (const row of categoryRows ?? []) {
    const name = row.category?.trim()
    if (!name) continue
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1)
  }

  const categories = Array.from(categoryCounts.keys()).sort((left, right) => left.localeCompare(right))

  let query = supabase
    .from('products')
    .select('*, product_variants(id, weight, price, compare_at_price, stock)')
    .eq('is_active', true)
  if (activeCategory) {
    query = query.eq('category', activeCategory)
  }
  switch (activeSort) {
    case 'name-asc':
      query = query.order('name', { ascending: true })
      break
    case 'price-asc':
      query = query.order('price', { ascending: true })
      break
    case 'price-desc':
      query = query.order('price', { ascending: false })
      break
    case 'featured':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }
  const { data: products, error } = await query

  const totalProducts = products?.length ?? 0
  const activeFilterCount = Number(Boolean(activeCategory)) + Number(activeSort !== 'featured')
  const popularProducts = (products ?? []).filter((product) => bestSellerProductIds.has(product.id)).slice(0, 4)

  return (
    <div className={styles.page}>
      <ProductsCopyVariantTracker copyVariant={copyVariant} />
      <div className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroCard}>
            <span className={styles.kicker}>Millco Collection</span>
            <h1>{heroCopy.title}</h1>
            <p>{heroCopy.description}</p>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <strong>FSSAI</strong>
                <span>Certified quality</span>
              </div>
              <div className={styles.stat}>
                <strong>HACCP</strong>
                <span>Safety process</span>
              </div>
              <div className={styles.stat}>
                <strong>GMP</strong>
                <span>Clean production</span>
              </div>
              <div className={styles.stat}>
                <strong>Clean</strong>
                <span>Chemical-free</span>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.controlsBand}>
          <div className={styles.filters}>
            <FilterPill href={buildProductsHref('', activeSort)} label="All" active={!activeCategory} />
            {categories.map((cat) => (
              <FilterPill
                key={cat}
                href={buildProductsHref(cat, activeSort)}
                label={`${cat} (${categoryCounts.get(cat) ?? 0})`}
                active={activeCategory === cat}
              />
            ))}
          </div>

          <div className={styles.sortRow}>
            <span className={styles.sortLabel}>Sort by</span>
            <div className={styles.sortOptions}>
              <FilterPill
                href={buildProductsHref(activeCategory, 'featured')}
                label="Featured"
                active={activeSort === 'featured'}
                className={styles.sortPill}
              />
              <FilterPill
                href={buildProductsHref(activeCategory, 'name-asc')}
                label="Name"
                active={activeSort === 'name-asc'}
                className={styles.sortPill}
              />
              <FilterPill
                href={buildProductsHref(activeCategory, 'price-asc')}
                label="Price ↑"
                active={activeSort === 'price-asc'}
                className={styles.sortPill}
              />
              <FilterPill
                href={buildProductsHref(activeCategory, 'price-desc')}
                label="Price ↓"
                active={activeSort === 'price-desc'}
                className={styles.sortPill}
              />
            </div>
          </div>

          {activeFilterCount > 0 ? (
            <div className={styles.activeStateRow}>
              <Link href="/products" className={styles.resetLink}>Clear all filters</Link>
            </div>
          ) : null}
        </div>

        {popularProducts.length > 0 ? (
          <section id="popular-picks" className={styles.featuredSection}>
            <div className={styles.featuredHeader}>
              <div>
                <h2>Fast-moving favourites from the Millco collection.</h2>
              </div>
              <Link href="#product-grid" className={styles.featuredLink}>Browse all products</Link>
            </div>

            <div className={styles.grid}>
              {popularProducts.map((product) => (
                <ProductCard key={`popular-${product.id}`} product={product} isBestSeller />
              ))}
            </div>
          </section>
        ) : null}

        {error ? (
          <p style={{ textAlign: 'center', color: '#C0392B', fontSize: '14px' }}>
            Unable to load products. Please try again later.
          </p>
        ) : products && products.length > 0 ? (
          <div id="product-grid" className={styles.grid}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} isBestSeller={bestSellerProductIds.has(product.id)} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              No products found{activeCategory ? ` in "${activeCategory}"` : ''}.
            </p>
            {activeCategory && (
              <Link href="/products">
                View all products →
              </Link>
            )}
          </div>
        )}

        {products && products.length > 0 && (
          <p className={styles.resultHint}>
            Showing {totalProducts} product{totalProducts === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </div>
  )
}

function buildProductsHref(category: string, sort: string) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (sort && sort !== 'featured') params.set('sort', sort)
  const query = params.toString()
  return query ? `/products?${query}` : '/products'
}

function FilterPill({
  href,
  label,
  active,
  className,
}: {
  href: string
  label: string
  active: boolean
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`${styles.filterPill} ${className ?? ''} ${active ? styles.filterPillActive : ''}`}
      aria-current={active ? 'page' : undefined}
    >
      {label}
    </Link>
  )
}
