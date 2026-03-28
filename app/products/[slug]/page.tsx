import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ProductCard from '@/components/ProductCard'
import type { Metadata } from 'next'
import { storeConfig } from '@/lib/config'
import { mergeImageSources, normalizeImageValue } from '@/lib/catalogMedia'
import { getBestSellerProductIds } from '@/lib/server/bestSellers'
import ProductDetailExperience from './ProductDetailExperience'
import styles from './product-detail.module.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { data: product } = await supabase
    .from('products')
    .select('name, description, image, price')
    .eq('slug', slug)
    .single()
  const title = product?.name
    ? `${product.name} | ${storeConfig.brandName}`
    : `Product | ${storeConfig.brandName}`
  const description = product?.name
    ? `Premium quality ${product.name} from ${storeConfig.brandName}.`
    : `Premium natural food product from ${storeConfig.brandName}.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product?.image ? [{ url: product.image as string }] : [],
    },
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const bestSellerProductIds = new Set(await getBestSellerProductIds(12))

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*, product_images(image_url, sort_order)')
    .eq('slug', slug)
    .single()

  if (!product || productError) return notFound()

  const { data: variants, error: variantError } = await supabase
    .from('product_variants')
    .select('*, variant_images(image_url, sort_order)')
    .eq('product_id', product.id)
    .order('price', { ascending: true })

  if (variantError) {
    // variant fetch error is non-critical, continue with empty variants
  }

  const safeVariants = (variants ?? []).map((variant) => ({
    ...variant,
    name:
      (variant as { name?: string | null; weight?: string | null }).name
      ?? (variant as { weight?: string | null }).weight
      ?? null,
    images: (() => {
      const relationImages = ((variant as { variant_images?: Array<{ image_url: string; sort_order: number }> }).variant_images ?? [])
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item) => item.image_url)
      return relationImages.length > 0 ? relationImages : normalizeImageValue((variant as { image?: unknown }).image)
    })(),
  }))
  const productGallery = mergeImageSources(
    ((product as { product_images?: Array<{ image_url: string; sort_order: number }> }).product_images ?? [])
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((item) => item.image_url),
    product.image,
  )
  const productCover = productGallery[0] ?? null
  const variantForSchema = safeVariants[0]

  // Related products: same category, exclude self, newest 4
  const { data: related } = product.category
    ? await supabase
        .from('products')
        .select('*, product_variants(id, weight, price, compare_at_price, stock)')
        .eq('category', product.category)
        .eq('is_active', true)
        .neq('id', product.id)
        .order('created_at', { ascending: false })
        .limit(4)
    : { data: [] }

  const safeRelated = related ?? []

  const { data: categoryRows } = await supabase
    .from('products')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null)

  const categories = Array.from(
    new Set(
      (categoryRows ?? [])
        .map((row) => row.category?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right))

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org/',
            '@type': 'Product',
            name: product.name,
            description: product.description ?? '',
            image: productCover ?? '',
            brand: { '@type': 'Brand', name: storeConfig.brandName },
            offers: {
              '@type': 'Offer',
              priceCurrency: storeConfig.currency,
              price: variantForSchema?.price ?? product.price ?? 0,
              availability:
                (variantForSchema?.stock ?? product.stock ?? 0) > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
              seller: { '@type': 'Organization', name: storeConfig.brandName },
            },
          }),
        }}
      />

      <div className={styles.page}>
        <nav aria-label="Breadcrumb" className={styles.breadcrumbBar}>
          <div className={styles.breadcrumbInner}>
            <Link href="/products" className={styles.breadcrumbLink}>
            All Products
          </Link>
          {product.category && (
            <>
              <span style={{ userSelect: 'none' }}>›</span>
              <Link href={`/products?category=${encodeURIComponent(product.category as string)}`} className={styles.breadcrumbLink}>
                {product.category as string}
              </Link>
            </>
          )}
          <span style={{ userSelect: 'none' }}>›</span>
          <span
            style={{
              color: '#1E1E1E',
              fontWeight: '500',
              maxWidth: '260px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {product.name as string}
          </span>
          </div>
        </nav>

        <div className={styles.pageBody}>
          <ProductDetailExperience
            productId={product.id}
            productName={product.name as string}
            productCategory={product.category as string | null}
            productSubcategory={product.subcategory as string | null}
            productDescription={product.description as string | null}
            productGallery={productGallery}
            variants={safeVariants}
            logoUrl={storeConfig.logoUrl}
            brandName={storeConfig.brandName}
          />
        </div>

        {safeRelated.length > 0 && (
          <section className={styles.relatedWrap}>
            <div className={styles.relatedSection}>
              <div className={styles.sectionHeader}>
                <h2>
                More from {product.category ?? 'this category'}
                </h2>
                <Link href={`/products${product.category ? `?category=${encodeURIComponent(product.category as string)}` : ''}`}>
                View all →
              </Link>
              </div>

              <div className={styles.relatedGrid}>
              {safeRelated.map((p) => (
                <ProductCard key={p.id} product={p} isBestSeller={bestSellerProductIds.has(p.id)} />
              ))}
            </div>
            </div>
          </section>
        )}

        <section className={styles.categoryWrap}>
          <div className={styles.categorySection}>
            <p className={styles.categoryStripLabel}>
              Browse categories
            </p>
            <div className={styles.categoryPills}>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/products?category=${encodeURIComponent(cat)}`}
                className={product.category === cat ? styles.categoryPillActive : styles.categoryPill}
              >
                {cat}
              </Link>
            ))}
              <Link href="/products" className={styles.categoryPillMuted}>
              All Products
            </Link>
          </div>
          </div>
        </section>
      </div>
    </>
  )
}
