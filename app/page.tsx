import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { tenantConfig } from '@/lib/tenant.config'
import { storeConfig } from '@/lib/config'
import { resolveDemoImage } from '@/lib/catalogMedia'
import ProductCard from '@/components/ProductCard'
import styles from './homepage.module.css'

export default async function HomePage() {
  const { data, error } = await supabase.from('products')
    .select('id,name,slug,description,image,category,price,stock,product_variants(id,weight,price,compare_at_price,stock)')
    .eq('is_active', true).order('created_at', { ascending: false }).limit(6)
  const products = (data ?? []).map(p => ({ ...p, description: p.description ?? undefined }))
  const hero = products.find(p => p.slug === 'demo-honey') ?? products[0]
  const heroImage = hero ? resolveDemoImage(hero.image, hero.slug) : null
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>THE EVERYDAY COLLECTION</span>
        <h1>Good things.<br />Simply shopped.</h1>
        <p>Discover everyday essentials, find your favourites, and make yourself at home.</p>
        <Link className={styles.primaryButton} href="/products">Explore the collection <span aria-hidden="true">↗</span></Link>
        <span className={styles.heroNote}>Browse. Choose. Make it yours.</span>
      </div>
      {hero && heroImage ? <Link href={'/products/' + hero.slug} className={styles.heroVisual} aria-label={'Discover ' + hero.name}>
        <Image src={heroImage} alt={hero.name} fill priority unoptimized sizes="(max-width: 700px) 100vw, 50vw" />
        <div className={styles.heroCaption}><span>IN THE COLLECTION</span><strong>{hero.name} <span aria-hidden="true">↗</span></strong></div>
      </Link> : <div className={styles.heroVisual}><span className={styles.emptyHero}>Welcome to {storeConfig.brandName}</span></div>}
    </section>
    <section className={styles.collection} id="collection">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>FIND YOUR EVERYDAY</span><h2>The collection</h2></div><Link href="/products">View all products <span aria-hidden="true">→</span></Link></div>
      {error ? <p>We couldn’t load the collection. Please try again shortly.</p> : products.length ? <div className={styles.productGrid}>{products.map(product => <ProductCard key={product.id} product={product} />)}</div> : <p>Our collection is coming soon. Check back for new arrivals.</p>}
    </section>
    <section className={styles.story} id="story"><span className={styles.eyebrow}>A SIMPLER WAY TO SHOP</span><div><h2>Less searching.<br />More finding your favourites.</h2><p>A straightforward collection, clear prices, and an easy checkout. Everything you need to shop at your own pace.</p><Link href="/products">Find something for your everyday →</Link></div></section>
    <section className={styles.serviceRow} aria-label="Shopping information"><div><span>01</span><strong>Easy browsing</strong><p>Compare sizes and prices before you choose.</p></div><div><span>02</span><strong>Secure checkout</strong><p>Payments are handled through Razorpay.</p></div><div><span>03</span><strong>Here to help</strong><p><a href={'mailto:' + tenantConfig.contact.supportEmail}>Get in touch with our store.</a></p></div></section>
  </div>
}
