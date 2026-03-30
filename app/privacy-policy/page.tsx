import type { Metadata } from 'next'
import styles from '@/app/legal.module.css'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Millco Organic & Fresh Food Products and shop.millco.in.',
}

const sections = [
  {
    title: '1. Information We Collect',
    body: 'When you browse or place an order on shop.millco.in, we may collect your name, phone number, email address, delivery address, order details, payment-related information, and any messages or support requests you send through our website, WhatsApp, email, or SMS channels.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your information to process and deliver orders, confirm payments, provide shipping updates, answer customer support requests, respond to WhatsApp or email queries, improve our services, and maintain records required for business, tax, fraud-prevention, and legal compliance purposes.',
  },
  {
    title: '3. WhatsApp Communication Consent',
    body: 'By contacting us on WhatsApp or choosing to receive order-related updates through WhatsApp, SMS, email, or our website, you consent to receive messages connected with your purchase, delivery, support request, or service communication. We do not use these channels for unrelated spam. You may request that we stop promotional communication at any time.',
  },
  {
    title: '4. Sharing of Information',
    body: 'We share customer information only where needed to operate the business. This may include delivery and logistics partners, payment gateways, communication providers, hosting and website infrastructure providers, and service partners involved in customer support or order fulfillment. We do not sell your personal data.',
  },
  {
    title: '5. Meta and WhatsApp Compliance',
    body: 'Where we use Meta platforms, including WhatsApp Business or Cloud API, customer messages and related delivery or support interactions are processed in line with Meta platform requirements. You should avoid sending sensitive payment credentials or unnecessary confidential information over messaging channels.',
  },
  {
    title: '6. Data Security',
    body: 'We use reasonable technical and organizational measures to protect customer data against unauthorized access, misuse, loss, or disclosure. However, no online system can guarantee absolute security, and customers should also take care when sharing personal information online.',
  },
  {
    title: '7. User Rights',
    body: 'Subject to applicable law, you may request access to your personal information, ask us to correct inaccurate details, or request deletion of information that we are not legally required to keep. Some data may be retained where necessary for tax, fraud-prevention, accounting, or legal obligations.',
  },
  {
    title: '8. Data Retention and Deletion Requests',
    body: 'We retain customer data only for as long as reasonably required for order management, customer support, legal compliance, dispute handling, and internal record keeping. To request deletion of your personal data, email us from your registered contact details and include your order information where relevant so we can verify and process the request safely.',
  },
  {
    title: '9. International Orders',
    body: 'Because Millco Organic & Fresh Food Products serves customers in India and may ship internationally, some information may be processed across borders where required for payment, logistics, customer service, or legal compliance.',
  },
  {
    title: '10. Policy Updates',
    body: 'We may update this Privacy Policy from time to time to reflect operational, legal, or regulatory changes. The revised version will be posted on this page with the updated effective date.',
  },
] as const

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Privacy Policy</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.intro}>
          This Privacy Policy explains how Millco Organic & Fresh Food Products collects, uses,
          stores, and protects personal information when you use shop.millco.in to browse,
          purchase, or communicate with us through the website, WhatsApp, email, or SMS.
        </p>
        <div className={styles.meta}>
          <span className={styles.metaChip}>Brand: Millco Organic & Fresh Food Products</span>
          <span className={styles.metaChip}>Website: shop.millco.in</span>
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
        <h2 className={styles.contactTitle}>Contact and Deletion Requests</h2>
        <p className={styles.contactText}>
          To request access, correction, or deletion of your data, please email{' '}
          <a href="mailto:info@millco.in">info@millco.in</a> with your full name, contact
          details, and order reference where available. We may ask for reasonable identity
          verification before acting on the request.
        </p>
      </section>
    </main>
  )
}
