'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useSyncExternalStore } from 'react'
import { getCartSnapshot, clearCart, removeFromCart, subscribeToCart, emitCartUpdated, CartItem } from '@/lib/cart'
import { storeConfig } from '@/lib/config'
import { moneyWithSymbol } from '@/lib/money'
import { calculateShippingRate } from '@/lib/shipping/rates'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { buildTenantWhatsAppUrl, isValidTenantPhone, tenantConfig } from '@/lib/tenant.config'
import styles from './checkout.module.css'

const EMPTY_CART: CartItem[] = []
const getServerSnapshot = (): CartItem[] => EMPTY_CART

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

type Status = 'idle' | 'creating' | 'paying' | 'saving' | 'error'
type PaymentMethod = 'razorpay' | 'cod'

type FieldErrors = {
  name?: string
  email?: string
  phone?: string
  address?: string
}

function validateField(field: keyof FieldErrors, value: string): string {
  switch (field) {
    case 'name': return value.trim() ? '' : 'Full name is required'
    case 'email': return /^\S+@\S+\.\S+$/.test(value.trim()) ? '' : 'Enter a valid email address'
    case 'phone': return isValidTenantPhone(value) ? '' : tenantConfig.region.phone.validationMessage
    case 'address': return value.trim() ? '' : 'Delivery address is required'
  }
}

const TRUST_POINTS = tenantConfig.marketing.checkout.trustPoints

export default function CheckoutPage() {
  const router = useRouter()
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerSnapshot)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  })
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [activePaymentMethod, setActivePaymentMethod] = useState<PaymentMethod>('razorpay')

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingQuote = calculateShippingRate(total)

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({})

  const handleChange = (field: keyof FieldErrors) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    if (touched[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
    }
  }

  const handleBlur = (field: keyof FieldErrors) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, form[field]) }))
  }

  const submitManualOrder = async (customer: typeof form) => {
    setStatus('saving')
    const response = await fetch('/api/create-manual-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer,
        items: cart.map((item) => ({
          variant_id: item.variant_id,
          variant_name: item.variant_name,
          quantity: item.quantity,
        })),
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to place order')

    clearCart()
    emitCartUpdated()
    const nextParams = new URLSearchParams({
      order_id: String(data.order_id ?? ''),
      token: String(data.confirmation_token ?? ''),
      payment_method: 'cod',
    })
    router.push(`/success?${nextParams.toString()}`)
  }

  const [pendingPayment, setPendingPayment] = useState<Record<string, unknown> | null>(null)
  const checkoutBusy = useRef(false)

  const savePaidOrder = async (payload: Record<string, unknown>) => {
    setStatus('saving')
    const response = await fetch('/api/save-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Payment received, but the order could not be saved. Retry saving; do not pay again.')
    if (!data.order_id || !data.confirmation_token) throw new Error('Order confirmation is incomplete. Retry saving; do not pay again.')
    setPendingPayment(null)
    clearCart()
    emitCartUpdated()
    router.push('/success?' + new URLSearchParams({ order_id: data.order_id, token: data.confirmation_token }).toString())
  }


  const handlePay = async (paymentMethod: PaymentMethod = 'razorpay') => {
    if (checkoutBusy.current) return
    checkoutBusy.current = true
    try {
    if (pendingPayment) {
      try { await savePaidOrder(pendingPayment) } catch (error) {
        setStatus('error')
        setErrorMsg(error instanceof Error ? error.message : 'Could not save your paid order. Please retry saving.')
      }
      return
    }
    if (cart.length === 0) return
    setActivePaymentMethod(paymentMethod)

    // Pre-check cart variants to avoid failing after payment for stale items.
    const variantIds = Array.from(new Set(cart.map((item) => item.variant_id).filter(Boolean)))
    if (variantIds.length > 0) {
      const { data: variants, error } = await supabaseBrowser
        .from('product_variants')
        .select('id')
        .in('id', variantIds)

      if (error) {
        setStatus('error')
        setErrorMsg('Could not verify cart items. Please try again in a moment.')
        return
      }

      const validIds = new Set((variants ?? []).map((variant) => String(variant.id)))
      const invalidItems = cart.filter((item) => !validIds.has(String(item.variant_id)))

      if (invalidItems.length > 0) {
        invalidItems.forEach((item) => removeFromCart(item.id))
        emitCartUpdated()
        setStatus('error')
        setErrorMsg('Some items in your cart were outdated and have been removed. Please review your cart and continue.')
        return
      }
    }

    const fields = ['name', 'email', 'phone', 'address'] as const
    const newErrors: FieldErrors = {}
    const newTouched: Partial<Record<keyof FieldErrors, boolean>> = {}
    for (const field of fields) {
      newTouched[field] = true
      newErrors[field] = validateField(field, form[field])
    }
    setTouched(newTouched)
    setFieldErrors(newErrors)
    if (Object.values(newErrors).some(Boolean)) return
    setErrorMsg('')

    const { name, email, phone, address } = form

    try {
      if (paymentMethod === 'cod') {
        await submitManualOrder({ name, email, phone, address })
        return
      }

      setStatus('creating')
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            variant_id: item.variant_id,
            quantity: item.quantity,
          })),
          deliveryAddress: address,
          customer: { name, email, phone, address },
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || 'Order creation failed')

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
      if (!razorpayKey) {
        throw new Error('Payment configuration is missing. Please contact support.')
      }

      const loaded = await loadRazorpayScript()
      if (!loaded) throw new Error('Could not load payment gateway. Check your connection.')

      setStatus('paying')
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: razorpayKey,
          amount: orderData.amount,
          currency: storeConfig.currency,
          name: storeConfig.brandName,
          description: 'Order Payment',
          order_id: orderData.order_id,
          prefill: { name, email, contact: phone },
          theme: { color: tenantConfig.branding.colors.primary },
          modal: {
            ondismiss: () => {
              setStatus('idle')
              reject(new Error('dismissed'))
            },
          },
          handler: async (response) => {
            try {
              const payload = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                customer: { name, email, phone, address },
                items: cart.map((item) => ({
                  variant_id: item.variant_id, variant_name: item.variant_name, quantity: item.quantity,
                })),
              }
              setPendingPayment(payload)
              await savePaidOrder(payload)

              resolve()
            } catch (error) {
              reject(error)
            }
          },
        })
        rzp.open()
      })
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'dismissed') return
      setStatus('error')
      setErrorMsg(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    }
    } finally { checkoutBusy.current = false }
  }

  const isLoading = status === 'creating' || status === 'saving' || status === 'paying'
  const manualPaymentsEnabled =
    process.env.NEXT_PUBLIC_FEATURE_MANUAL_PAYMENTS === 'true' ||
    tenantConfig.features.manualPayments
  const buttonLabel =
    pendingPayment && status !== 'saving' ? 'Retry saving paid order'
    : status === 'creating' ? 'Creating order…'
    : status === 'saving' ? 'Saving order…'
    : status === 'paying' ? 'Processing…'
    : `Pay Securely ${moneyWithSymbol(shippingQuote.total)}`

  const whatsAppMessage = cart.length > 0
    ? `${tenantConfig.marketing.whatsapp.checkoutIntroMessage}\n${cart.map((item) => `- ${item.name} (${item.variant_name}) ×${item.quantity}`).join('\n')}\nTotal: ${moneyWithSymbol(shippingQuote.total)}`
    : ''
  const whatsAppUrl = whatsAppMessage ? buildTenantWhatsAppUrl(whatsAppMessage) : ''

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <section className={styles.body}>
          {cart.length > 0 ? (
          <div className={styles.formCard}>
            <div className={styles.formIntro}>
              <Link href="/cart" className={styles.backLink}>← Back to Cart</Link>
              <h2>Where should we send your order?</h2>
              <p className={styles.formLead}>
                We use these details only for fulfilment, delivery updates, and payment confirmation.
              </p>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                className={`${styles.input}${fieldErrors.name ? ' ' + styles.inputHasError : ''}`}
                placeholder="Arjun Sharma"
                value={form.name}
                onChange={handleChange('name')}
                onBlur={handleBlur('name')}
                autoComplete="name"
              />
              {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className={`${styles.input}${fieldErrors.email ? ' ' + styles.inputHasError : ''}`}
                placeholder="arjun@example.com"
                value={form.email}
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                autoComplete="email"
              />
              {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="phone">Mobile Number</label>
              <input
                id="phone"
                type="tel"
                className={`${styles.input}${fieldErrors.phone ? ' ' + styles.inputHasError : ''}`}
                placeholder="9876543210"
                value={form.phone}
                onChange={handleChange('phone')}
                onBlur={handleBlur('phone')}
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
              />
              {fieldErrors.phone && <span className={styles.fieldError}>{fieldErrors.phone}</span>}
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="address">Delivery Address</label>
              <textarea
                id="address"
                className={`${styles.textarea}${fieldErrors.address ? ' ' + styles.inputHasError : ''}`}
                placeholder="Flat / House No., Street, City, State, PIN"
                value={form.address}
                onChange={handleChange('address')}
                onBlur={handleBlur('address')}
                rows={4}
                autoComplete="street-address"
              />
              {fieldErrors.address && <span className={styles.fieldError}>{fieldErrors.address}</span>}
            </div>
          </div>
          ) : null}

          {cart.length === 0 ? (
            <aside className={styles.emptyCard}>
              <span className={styles.kicker}>No Items</span>
              <h2>Your cart is empty.</h2>
              <p>Add products before you continue to payment.</p>
              <Link href="/products" className={styles.browseButton}>
                Browse Products
              </Link>
            </aside>
          ) : (
            <aside className={styles.summaryCard}>
              <div className={styles.summaryIntro}>
                <span className={styles.kicker}>Order Summary</span>
                <h2>What you are paying for</h2>
                <div className={styles.summaryMetaBar}>
                  <span>{cart.length} item{cart.length === 1 ? '' : 's'} in cart</span>
                  <span>Fresh dispatch after payment</span>
                </div>
              </div>

              <div className={styles.summaryList}>
                {cart.map((item) => (
                  <div key={item.id} className={styles.summaryItem}>
                    <div>
                      <div className={styles.summaryItemTitle}>{item.name}</div>
                      <div className={styles.summaryItemMeta}>
                        {item.variant_name} · Qty {item.quantity} × {moneyWithSymbol(item.price)}
                      </div>
                    </div>
                    <div className={styles.summaryPrice}>{moneyWithSymbol(item.price * item.quantity)}</div>
                  </div>
                ))}
              </div>

              <div className={styles.summaryTotal}>
                <span>Subtotal</span>
                <span>{moneyWithSymbol(total)}</span>
              </div>
              <div className={styles.summaryTotal}>
                <span>Shipping</span>
                <span>{shippingQuote.shippingAmount > 0 ? moneyWithSymbol(shippingQuote.shippingAmount) : 'Free'}</span>
              </div>
              <div className={styles.summaryTotal}>
                <span>Total</span>
                <span>{moneyWithSymbol(shippingQuote.total)}</span>
              </div>

              {(status === 'error' || errorMsg) && (
                <div className={styles.errorBox}>{errorMsg || 'Something went wrong. Please try again.'}</div>
              )}

              <button onClick={() => handlePay('razorpay')} disabled={isLoading || cart.length === 0} className={styles.payButton}>
                {!isLoading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
                {buttonLabel}
              </button>

              {manualPaymentsEnabled ? (
                <button
                  type="button"
                  onClick={() => handlePay('cod')}
                  disabled={isLoading || cart.length === 0}
                  className={styles.whatsAppFallback}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isLoading && activePaymentMethod === 'cod' ? 'Placing order...' : 'Place order and pay on delivery'}
                </button>
              ) : null}

              <div className={styles.trustStrip}>
                {TRUST_POINTS.map((point) => (
                  <div key={point} className={styles.trustRow}>
                    <span className={styles.trustCheck}>✓</span>
                    <span>{point}</span>
                  </div>
                ))}
                <div className={styles.trustRow}>
                  <span className={styles.trustCheck}>✓</span>
                  <span>Fulfilled directly by {storeConfig.brandName}</span>
                </div>
              </div>

              {whatsAppUrl && (
                <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className={styles.whatsAppFallback}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.12 1.528 5.85L.057 23.869l6.204-1.427A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.914a9.892 9.892 0 0 1-5.047-1.381l-.361-.214-3.735.98.998-3.647-.236-.374A9.867 9.867 0 0 1 2.086 12C2.086 6.516 6.516 2.086 12 2.086S21.914 6.516 21.914 12 17.484 21.914 12 21.914z" />
                  </svg>
                  Order via WhatsApp instead
                </a>
              )}
            </aside>
          )}
        </section>

        <section className={styles.hero}>
          <div className={styles.heroCard}>
            <span className={styles.kicker}>Secure Checkout</span>
            <h1>{tenantConfig.marketing.checkout.heroTitle}</h1>
            <p>
              {tenantConfig.marketing.checkout.heroDescription}
            </p>
            <div className={styles.checkpoints}>
              {tenantConfig.marketing.checkout.heroCheckpoints.map((checkpoint) => (
                <span key={checkpoint} className={styles.checkpoint}>{checkpoint}</span>
              ))}
            </div>
          </div>

          <aside className={styles.brandCard}>
            <div className={styles.logoRow}>
              <Image
                src={storeConfig.logoUrl}
                alt={storeConfig.brandName}
                width={82}
                height={82}
                unoptimized
                style={{ width: '82px', height: 'auto' }}
              />
              <div className={styles.logoMeta}>
                <span>{storeConfig.brandName}</span>
                <strong>{tenantConfig.marketing.header.mobileSubtitle}</strong>
              </div>
            </div>
            <h2>{tenantConfig.marketing.checkout.brandCardTitle}</h2>
            <p>
              {tenantConfig.marketing.checkout.brandCardBody}
            </p>
          </aside>
        </section>

        {cart.length > 0 && (
          <div className={styles.mobileStickyBar}>
            <div className={styles.mobileStickyLeft}>
              <span className={styles.mobileStickyTotalLabel}>Total</span>
              <span className={styles.mobileStickyTotalAmount}>{moneyWithSymbol(shippingQuote.total)}</span>
            </div>
            <button
              onClick={() => handlePay('razorpay')}
              disabled={isLoading || cart.length === 0}
              className={styles.mobileStickyPayBtn}
            >
              {isLoading ? buttonLabel : `Pay Securely ${moneyWithSymbol(shippingQuote.total)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
