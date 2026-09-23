import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getBestSellerProductIds } from '@/lib/server/bestSellers'
import { storeConfig } from '@/lib/config'
import { tenantConfig } from '@/lib/tenant.config'
import TrackedLink from '@/components/TrackedLink'
import ProductCard from '@/components/ProductCard'
import styles from './homepage.module.css'

type RawProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  category: string | null
  price: number | null
  stock: number | null
  is_active: boolean
  product_variants: Array<{ id: string | null; weight: string | null; price: number | null; compare_at_price: number | null; stock: number | null }> | null
}

type ProductView = {
  id: string
  name: string
  slug: string
  description: string
  image: string | null
  category: string
  startingPrice: number
  stock: number
  product_variants: Array<{ id: string | null; weight: string | null; price: number | null; compare_at_price: number | null; stock: number | null }>
}

const QUALITY_CERTS = tenantConfig.marketing.home.qualityCertifications
const NATURAL_CERTS = tenantConfig.marketing.home.naturalCertifications
const EXPORT_CERTS = tenantConfig.marketing.home.exportCertifications

const CHOOSE_US_POINTS = tenantConfig.marketing.home.chooseUsPoints

type CategoryCollection = {
  title: string
  detail: string
  href: string
}

export const metadata = {
  title: `${storeConfig.brandName} - ${tenantConfig.marketing.home.metaTitleSuffix}`,
  description: tenantConfig.marketing.home.metaDescription,
}

const TRUST_ROW = tenantConfig.marketing.home.trustRow

function getStartingPrice(product: RawProduct): number {
  const prices = (product.product_variants ?? [])
    .map((variant) => Number(variant.price ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0)

  if (prices.length > 0) return Math.min(...prices)
  return Number(product.price ?? 0)
}

function toProductView(product: RawProduct): ProductView {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? 'Traditional processing with clean, natural ingredients.',
    image: product.image,
    category: product.category ?? 'Natural Product',
    startingPrice: getStartingPrice(product),
    stock: Number(product.stock ?? 0),
    product_variants: product.product_variants ?? [],
  }
}

function pickHeroProduct(products: ProductView[]): ProductView | null {
  if (products.length === 0) return null
  return products.find((product) => Boolean(product.image)) ?? products[0]
}

function buildHeroProducts(products: ProductView[]): ProductView[] {
  const imageProducts = products.filter((product) => Boolean(product.image))
  if (imageProducts.length === 0) return products.slice(0, 3)

  const primary = pickHeroProduct(imageProducts)
  if (!primary) return imageProducts.slice(0, 3)

  const others = imageProducts.filter((product) => product.id !== primary.id).slice(0, 2)
  return [primary, ...others]
}

function buildCategoryCollections(products: ProductView[]): CategoryCollection[] {
  const counts = new Map<string, number>()

  for (const product of products) {
    const category = product.category.trim()
    if (!category) continue
    counts.set(category, (counts.get(category) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([title, count]) => ({
      title,
      detail: `${count} product${count === 1 ? '' : 's'} available in this collection.`,
      href: `/products?category=${encodeURIComponent(title)}`,
    }))
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

export default async function HomePage() {
  const { data } = await supabase
    .from('products')
    .select('id,name,slug,description,image,category,price,stock,is_active,product_variants(id, weight, price, compare_at_price, stock)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(12)

  const products = ((data as RawProduct[] | null) ?? []).map(toProductView)
  const bestSellerProductIds = new Set(await getBestSellerProductIds(10))
  const featuredProducts = products.slice(0, 6)
  const rankedBestSellers = products.filter((product) => bestSellerProductIds.has(product.id)).slice(0, 6)
  const bestSellers = rankedBestSellers.length > 0
    ? rankedBestSellers
    : products.slice(6, 12).length > 0
      ? products.slice(6, 12)
      : featuredProducts
  const heroProduct = pickHeroProduct(products)
  const heroProducts = buildHeroProducts(products)
  const categoryCollections = buildCategoryCollections(products)

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <span className={styles.heroKicker}>{tenantConfig.marketing.home.heroKicker}</span>
            <h1 className={styles.heroTitle}>{tenantConfig.marketing.home.heroTitle}</h1>
            <p className={styles.heroText}>
              {tenantConfig.marketing.home.heroDescription}
            </p>
            <div className={styles.heroCtaRow}>
              <TrackedLink
                href="/products"
                className={`${styles.button} ${styles.buttonPrimary}`}
                eventName="homepage_cta_shop_now_click"
                eventData={{ location: 'hero' }}
              >
                Shop Now
              </TrackedLink>
              <TrackedLink
                href="#certifications"
                className={`${styles.button} ${styles.buttonGhost}`}
                eventName="homepage_cta_why_trust_click"
                eventData={{ location: 'hero' }}
              >
                Why Trust Us
              </TrackedLink>
            </div>
            <div className={styles.heroTrustRow}>
              {TRUST_ROW.map((item) => (
                <span key={item} className={styles.heroTrustChip}>{item}</span>
              ))}
            </div>
            <div className={styles.quickBuyPanel}>
              <span>Fast order path</span>
              <strong>Choose product - Add to cart - Secure checkout</strong>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroImageCard}>
              {heroProducts.length > 0 ? (
                <div className={styles.heroCarousel}>
                  {heroProducts.map((product, index) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      className={styles.heroSlide}
                      aria-label={`View ${product.name}`}
                    >
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          unoptimized
                          priority={index === 0}
                          className={styles.heroImage}
                        />
                      ) : (
                        <div className={styles.heroPlaceholder} data-tone={getProductTone(product.category)}>
                            <span>{product.name}</span>
                        </div>
                      )}
                      <div className={styles.heroImageOverlay}>
                        <span>From {storeConfig.brandName}</span>
                        <strong>{product.name}</strong>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <>
                  {heroProduct?.image ? (
                    <Image
                      src={heroProduct.image}
                      alt={heroProduct.name}
                      fill
                      unoptimized
                      priority
                      className={styles.heroImage}
                    />
                  ) : (
                    <div className={styles.heroPlaceholder} data-tone={getProductTone(heroProduct?.category)}>
                      <span>{tenantConfig.marketing.home.heroPlaceholderProduct}</span>
                    </div>
                  )}
                  <div className={styles.heroImageOverlay}>
                    <span>From {storeConfig.brandName}</span>
                    <strong>{heroProduct?.name ?? tenantConfig.marketing.home.heroPlaceholderProduct}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionKicker}>Quick Buy</p>
          <h2>{tenantConfig.marketing.home.featuredHeading}</h2>
          <p>Pick a bestseller, add it to cart, and complete checkout without losing the product page.</p>
        </div>
        <ProductGrid products={featuredProducts} emptyText="Featured products will appear here soon." />
      </section>

      <section
        id="certifications"
        className={`${styles.section} ${styles.sectionAlt}`}
        style={{ scrollMarginTop: '104px' }}
      >
        <div className={styles.sectionHead}>
          <p className={styles.sectionKicker}>Certifications</p>
          <h2>{tenantConfig.marketing.home.certificationsHeading}</h2>
          <p>{tenantConfig.marketing.home.certificationsDescription}</p>
        </div>

        <div className={styles.certificationGroupGrid}>
          <CertificationGroup title="Quality and Safety" items={QUALITY_CERTS} />
          <CertificationGroup title="Natural and Compliance" items={NATURAL_CERTS} />
          <CertificationGroup title="Government and Export" items={EXPORT_CERTS} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionKicker}>Why Choose Us</p>
          <h2>{tenantConfig.marketing.home.whyChooseHeading}</h2>
        </div>

        <div className={styles.featureGrid}>
          {CHOOSE_US_POINTS.map((point) => (
            <article key={point} className={styles.featureCard}>
              <span className={styles.featureDot} aria-hidden="true" />
              <h3>{point}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionHead}>
          <p className={styles.sectionKicker}>Collections</p>
          <h2>{tenantConfig.marketing.home.collectionsHeading}</h2>
        </div>

        <div className={styles.collectionGrid}>
          {categoryCollections.length > 0 ? categoryCollections.map((category) => (
            <Link key={category.title} href={category.href} className={styles.collectionCard}>
              <h3>{category.title}</h3>
              <p>{category.detail}</p>
              <span>Explore</span>
            </Link>
          )) : (
            <Link href="/products" className={styles.collectionCard}>
              <h3>All Products</h3>
              <p>Your live collections will appear here as products are added to categories.</p>
              <span>Explore</span>
            </Link>
          )}
        </div>
      </section>

      {bestSellers.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Best Sellers</p>
            <h2>{tenantConfig.marketing.home.bestSellersHeading}</h2>
          </div>
          <ProductGrid products={bestSellers} emptyText="Best sellers will appear here as your catalog grows." showBestSellerBadge />
        </section>
      ) : null}

      <section
        id="story"
        className={`${styles.section} ${styles.sectionAlt}`}
        style={{ scrollMarginTop: '104px' }}
      >
        <div className={styles.storyCard}>
          <p className={styles.sectionKicker}>Brand Story</p>
          <h2>{tenantConfig.marketing.home.brandStoryHeading}</h2>
          <p>
            {tenantConfig.marketing.home.brandStoryBody}
          </p>
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2>{tenantConfig.marketing.home.finalCtaHeading}</h2>
        <p>{tenantConfig.marketing.home.finalCtaBody}</p>
        <TrackedLink
          href="/products"
          className={`${styles.button} ${styles.buttonPrimary}`}
          eventName="homepage_cta_shop_now_click"
          eventData={{ location: 'final-cta' }}
        >
          Shop Now
        </TrackedLink>
      </section>
    </div>
  )
}

function CertificationGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <article className={styles.certificationGroup}>
      <h3>{title}</h3>
      <div className={styles.certificationBadgeWrap}>
        {items.map((item) => (
          <div key={item} className={styles.certificationBadge}>
            <span className={styles.badgeIcon} aria-hidden="true">
              ✓
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function ProductGrid({
  products,
  emptyText,
  showBestSellerBadge = false,
}: {
  products: ProductView[]
  emptyText: string
  showBestSellerBadge?: boolean
}) {
  if (products.length === 0) {
    return <p className={styles.emptyState}>{emptyText}</p>
  }

  return (
    <div className={styles.productGrid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} isBestSeller={showBestSellerBadge} />
      ))}
    </div>
  )
}
