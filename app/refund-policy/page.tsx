import type { Metadata } from 'next'
import styles from '@/app/legal.module.css'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Refund, replacement, and cancellation policy for shop.millco.in.',
}

export default function RefundPolicyPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Refund Policy</p>
        <h1 className={styles.title}>Refund Policy</h1>
        <p className={styles.intro}>
          Because our products are consumable food items, returns are generally not accepted once
          an order has been delivered. This policy explains when a refund, replacement, or
          cancellation may still be available.
        </p>
        <div className={styles.meta}>
          <span className={styles.metaChip}>Consumable goods policy</span>
          <span className={styles.metaChip}>Report window: within 24 hours</span>
          <span className={styles.metaChip}>Effective date: March 30, 2026</span>
        </div>
      </section>

      <div className={styles.sections}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. No Return for Consumable Goods</h2>
          <p className={styles.text}>
            For hygiene, safety, and quality reasons, food and other consumable products sold on
            shop.millco.in are not eligible for return once delivered, except where the item is
            damaged, defective, or materially different from what was ordered.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Eligible Cases for Refund or Replacement</h2>
          <ul className={styles.list}>
            <li>You received a damaged package or damaged product.</li>
            <li>You received the wrong item.</li>
            <li>The delivered item has a genuine quality defect present at delivery.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Time Limit to Report an Issue</h2>
          <p className={styles.text}>
            Any issue must be reported within 24 hours of delivery. Claims raised after this period
            may not be accepted because product condition, storage, and handling can no longer be
            reasonably verified.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Proof Required</h2>
          <p className={styles.text}>
            To review a refund or replacement request, we may require clear photos or videos of the
            outer package, shipping label, received item, and the issue reported. This helps us
            verify courier damage, product mismatch, or defects and resolve the matter fairly.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Replacement or Refund Decision</h2>
          <p className={styles.text}>
            Once the issue is reviewed, we may offer a replacement, store credit, or refund,
            depending on product availability, the nature of the issue, and operational feasibility.
            Our decision will be based on the evidence provided and internal verification.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Refund Processing Timeline</h2>
          <p className={styles.text}>
            Approved refunds are generally processed within 5 to 10 business days after approval.
            The time taken for the amount to appear in your account may vary depending on the
            payment method, bank, card issuer, or payment gateway.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Cancellation Rules</h2>
          <p className={styles.text}>
            Orders may be cancelled only before dispatch. Once an order has been packed,
            transferred to a courier, or marked as dispatched, cancellation may no longer be
            possible. To request cancellation, contact us as quickly as possible through email or
            WhatsApp with your order details.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Contact for Refund Requests</h2>
          <p className={styles.text}>
            Send refund or replacement requests to info@millco.in and include your order number,
            registered phone number, and supporting photos or videos. You may also contact us using
            the communication channels listed on the website for faster coordination.
          </p>
        </section>
      </div>

      <section className={styles.contactBox}>
        <h2 className={styles.contactTitle}>Need Help With an Order?</h2>
        <p className={styles.contactText}>
          For refund, replacement, or cancellation support, contact{' '}
          <a href="mailto:info@millco.in">info@millco.in</a> within the reporting window and keep
          your proof ready for review.
        </p>
      </section>
    </main>
  )
}