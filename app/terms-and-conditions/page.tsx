import type { Metadata } from 'next'
import styles from '@/app/legal.module.css'
import { tenantConfig } from '@/lib/tenant.config'

const legal = tenantConfig.legal

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: `Terms and Conditions for purchases and use of ${legal.websiteLabel}.`,
}

const sections = [
  {
    title: '1. General Use of the Website',
    body: `By accessing or using ${legal.websiteLabel}, you agree to use the website lawfully and in accordance with these Terms & Conditions. This website is operated by ${legal.operatorName} for ${legal.businessDescription}.`,
  },
  {
    title: '2. Product Information and Availability',
    body: 'We aim to keep product descriptions, images, pricing, stock, and availability accurate. However, products may occasionally be unavailable, discontinued, or updated without prior notice. Minor differences in packaging, labeling, or appearance may occur depending on batch or supplier updates.',
  },
  {
    title: '3. Orders and Pricing',
    body: 'All orders are subject to acceptance and availability. We reserve the right to refuse, cancel, or limit an order where pricing errors, stock issues, suspected fraud, regulatory restrictions, or operational concerns arise. Prices shown on the website are subject to change without notice, but confirmed orders will generally be charged at the price displayed at checkout unless cancellation is required.',
  },
  {
    title: '4. Payment Terms',
    body: 'Customers must complete payment through the payment options made available on the website unless a separate approved method is provided. Payments are processed through third-party providers, and your use of those payment services may also be subject to their own terms and privacy policies.',
  },
  {
    title: '5. Shipping and Delivery',
    body: 'We deliver across India and may support international shipping where available. Delivery timelines are estimates only and may be affected by courier performance, customs handling, weather, holidays, or address issues. Customers are responsible for providing complete and accurate delivery details. Additional duties, taxes, or import charges for international shipments are the responsibility of the customer unless stated otherwise.',
  },
  {
    title: '6. WhatsApp and Communication Consent',
    body: 'By submitting your contact details or communicating with us through WhatsApp, email, SMS, or the website, you consent to receive order confirmations, delivery updates, support responses, and service-related communication through those channels. Communication sent through Meta or WhatsApp services is also subject to applicable platform policies.',
  },
  {
    title: '7. User Responsibilities',
    body: 'You agree to provide accurate information, use the website only for legitimate purchases or inquiries, avoid misuse of our systems, and not submit false, misleading, unlawful, or harmful content through website forms, messaging, or support channels.',
  },
  {
    title: '8. Refunds, Replacements, and Cancellations',
    body: 'Refunds, replacements, and cancellations are governed by our Refund Policy. By placing an order, you agree to review and follow the refund and reporting timelines stated there.',
  },
  {
    title: '9. Limitation of Liability',
    body: `To the maximum extent permitted by law, ${legal.operatorName} will not be liable for indirect, incidental, special, or consequential losses arising from use of the website, delayed deliveries, third-party service interruptions, or misuse of customer accounts or devices. Our total liability in relation to any order will generally not exceed the amount paid for the affected order.`,
  },
  {
    title: '10. Governing Law',
    body: `These Terms & Conditions are governed by the laws of ${legal.jurisdictionCountry}. Any dispute arising from use of the website or purchase of products shall be subject to the applicable courts and legal processes in ${legal.jurisdictionCountry}, unless mandatory law requires otherwise.`,
  },
  {
    title: '11. Changes to These Terms',
    body: 'We may revise these Terms & Conditions from time to time to reflect business, legal, or operational changes. Continued use of the website after updates are posted will indicate acceptance of the revised terms.',
  },
] as const

export default function TermsAndConditionsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Terms & Conditions</p>
        <h1 className={styles.title}>Terms & Conditions</h1>
        <p className={styles.intro}>
          These Terms & Conditions govern your access to {legal.websiteLabel} and your purchase of
          products from {legal.operatorName}. Please read them carefully before using
          the website or placing an order.
        </p>
        <div className={styles.meta}>
          <span className={styles.metaChip}>Business: {legal.operatorName}</span>
          <span className={styles.metaChip}>Market: {legal.jurisdictionCountry}</span>
          <span className={styles.metaChip}>Effective date: March 30, 2026</span>
        </div>
      </section>

      <div className={styles.sections}>
        {sections.map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <p className={styles.text}>{section.body}</p>
          </section>
        ))}
      </div>

      <section className={styles.contactBox}>
        <h2 className={styles.contactTitle}>Contact</h2>
        <p className={styles.contactText}>
          If you have questions about these Terms & Conditions, contact us at{' '}
          <a href={`mailto:${legal.supportEmail}`}>{legal.supportEmail}</a>. Please include your name and
          order details if your question relates to a purchase.
        </p>
      </section>
    </main>
  )
}
