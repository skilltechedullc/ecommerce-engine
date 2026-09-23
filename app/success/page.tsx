import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { storeConfig } from '@/lib/config'
import { moneyWithSymbol } from '@/lib/money'
import { buildTenantWhatsAppUrl, tenantConfig } from '@/lib/tenant.config'
import styles from './success.module.css'

export const metadata = {
  title: `Order Confirmed — ${storeConfig.brandName}`,
  description: 'Your order has been placed successfully.',
}

type SuccessPageProps = {
  searchParams: Promise<{
    order_id?: string
    token?: string
    payment_method?: string
  }>
}

type RecommendedProduct = {
  id: string
  name: string
  slug: string
  image?: string | null
  price?: number | null
}

type OrderRecord = {
  total_amount: number | string | null
  payment_method?: string | null
}

type OrderItemRecord = {
  product_id: string | null
  product_name: string
  quantity: number
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const orderId = (params.order_id ?? '').trim()
  const confirmationToken = (params.token ?? '').trim()

  let orderTotal = 0
  let itemSummary: string[] = []
  let purchasedProductIds = new Set<string>()
  let paymentMethod = params.payment_method === 'cod' ? 'cod' : 'razorpay'

  if (orderId && confirmationToken) {
    const supabaseAdmin = getSupabaseAdmin()
    const [{ data: order }, { data: items }] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('total_amount, payment_method')
        .eq('id', orderId)
        .eq('confirmation_token', confirmationToken)
        .maybeSingle<OrderRecord>(),
      supabaseAdmin
        .from('order_items')
        .select('product_id, product_name, quantity')
        .eq('order_id', orderId)
        .returns<OrderItemRecord[]>(),
    ])

    if (order?.total_amount != null) {
      const dbTotal = Number(order.total_amount)
      if (Number.isFinite(dbTotal) && dbTotal > 0) {
        orderTotal = dbTotal
      }
      paymentMethod = order.payment_method === 'cod' ? 'cod' : 'razorpay'
    }

    if (order && items && items.length > 0) {
      itemSummary = items.map((item) => `${item.product_name} x${item.quantity}`)
      purchasedProductIds = new Set(
        items
          .map((item) => item.product_id?.trim())
          .filter((value): value is string => Boolean(value))
      )
    }
  }

  const hasValidTotal = Number.isFinite(orderTotal) && orderTotal > 0

  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, image, price')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  const allCandidates = (products ?? []) as RecommendedProduct[]
  const withoutPurchased = allCandidates.filter((product) => !purchasedProductIds.has(String(product.id)))
  const recommendedProducts = (withoutPurchased.length > 0 ? withoutPurchased : allCandidates).slice(0, 2)
  const supportMessage = orderId
    ? `Hi, I need help with my order ${orderId}.`
    : tenantConfig.marketing.whatsapp.orderHelpMessage
  const supportUrl = buildTenantWhatsAppUrl(supportMessage)

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <Image
            src={storeConfig.logoUrl}
            alt={storeConfig.brandName}
            width={92}
            height={92}
            priority
            style={{ width: '92px', height: 'auto' }}
          />
        </div>

        <div className={styles.checkWrap}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0f3d2e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1>Order confirmed.</h1>
        <p className={styles.lead}>
          {tenantConfig.marketing.success.lead}
        </p>

        <div className={styles.pillRow}>
          <span className={styles.pill}>{paymentMethod === 'cod' ? 'Pay on delivery' : 'Payment received'}</span>
          <span className={styles.pill}>Fulfilment queued</span>
          <span className={styles.pill}>Fresh dispatch soon</span>
        </div>

        <div className={styles.divider} />

        <section className={styles.orderDetails} aria-label="Order details">
          <h2>Order Details</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span>Order ID</span>
              <strong>{orderId || 'Will appear in confirmation message'}</strong>
            </div>
            <div className={styles.detailItem}>
              <span>Total Amount</span>
              <strong>{hasValidTotal ? moneyWithSymbol(orderTotal) : 'Included in your confirmation'}</strong>
            </div>
          </div>

          {itemSummary.length > 0 && (
            <div className={styles.itemSummary}>
              <span>Items</span>
              <ul>
                {itemSummary.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className={styles.nextSteps} aria-label="Next steps">
          <h2>What Happens Next</h2>
          <div className={styles.stepList}>
            <div className={styles.stepItem}>
              <strong>Order processing</strong>
              <p>{tenantConfig.marketing.success.processingCopy}</p>
            </div>
            <div className={styles.stepItem}>
              <strong>Dispatch timeline</strong>
              <p>{tenantConfig.marketing.success.dispatchCopy}</p>
            </div>
          </div>
        </section>

        <div className={styles.actionRow}>
          <Link href="/products" className={styles.primaryButton}>
            Continue Shopping
          </Link>
          <Link href="/" className={styles.secondaryButton}>
            Back Home
          </Link>
        </div>

        {recommendedProducts.length > 0 && (
          <section className={styles.recommendSection} aria-label="You may also like">
            <h2>You may also like</h2>
            <div className={styles.recommendGrid}>
              {recommendedProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.slug}`} className={styles.recommendCard}>
                  <div className={styles.recommendMedia}>
                    {product.image ? (
                      <Image src={product.image} alt={product.name} fill className={styles.recommendImage} unoptimized />
                    ) : null}
                  </div>
                  <div className={styles.recommendBody}>
                    <strong>{product.name}</strong>
                    <span>{Number(product.price ?? 0) > 0 ? moneyWithSymbol(Number(product.price)) : 'View details'}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {supportUrl && (
          <a href={supportUrl} target="_blank" rel="noopener noreferrer" className={styles.supportLink}>
            Need help? Contact via WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}

