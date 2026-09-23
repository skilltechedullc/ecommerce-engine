import Link from 'next/link'
import { storeConfig } from '@/lib/config'
import { tenantConfig } from '@/lib/tenant.config'
import styles from './footer.module.css'
export default function Footer() {
  return <footer id="contact" className={styles.footer}>
    <div className={styles.grid}><div><Link href="/" className={styles.brand}>{storeConfig.brandName}</Link><p>Everyday essentials.<br />A simpler way to shop.</p></div>
    <nav aria-label="Shopping links"><h2>Explore</h2><Link href="/products">Shop all</Link><Link href="/orders/track">Track your order</Link><Link href="/cart">Your cart</Link></nav>
    <nav aria-label="Store policies"><h2>Information</h2><Link href="/privacy-policy">Privacy policy</Link><Link href="/terms-and-conditions">Terms & conditions</Link><Link href="/refund-policy">Returns & refunds</Link></nav>
    <div><h2>Let’s talk</h2><p>Questions about your order?</p><a href={'mailto:' + tenantConfig.contact.supportEmail}>{tenantConfig.contact.supportEmail}</a></div></div>
    <div className={styles.bottom}><span>© {new Date().getFullYear()} {storeConfig.brandName}</span><span>Payments powered by Razorpay</span></div>
  </footer>
}
