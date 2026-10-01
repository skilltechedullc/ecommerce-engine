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
    .eq('is_active', true).order('created_at', { ascending: false }).limit(8)
  const preferred = ['sulphur-free-coconut-oil', 'wayanadan-honey', 'cold-pressed-sesame-oil', 'ventha-velichenna', 'sidr-honey', 'cold-pressed-coconut-oil', 'arrowroot-powder']
  const products = (data ?? []).map(p => ({ ...p, description: p.description ?? undefined })).sort((a, b) => {
    const rank = (slug: string) => preferred.includes(slug) ? preferred.indexOf(slug) : preferred.length
    return rank(a.slug) - rank(b.slug)
  })
  const hero = products.find(p => p.slug === 'sulphur-free-coconut-oil') ?? products[0]
  const heroImage = hero ? resolveDemoImage(hero.image, hero.slug) : null
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>FROM OUR KERALA ROOTS</span>
        <h1>A little Kerala.<br />In every kitchen.</h1>
        <p>Coconut oils, honey and pantry favourites. Familiar ingredients, thoughtful choices, and everyday moments worth savouring.</p>
        <Link className={styles.primaryButton} href="/products">Shop the pantry <span aria-hidden="true">↗</span></Link>
        <span className={styles.heroNote}>Delivery across India · Free shipping from ₹1,000</span>
      </div>
      {hero && heroImage ? <Link href={'/products/' + hero.slug} className={styles.heroVisual} aria-label={'Discover ' + hero.name}>
        <Image src={heroImage} alt={hero.name} fill priority unoptimized sizes="(max-width: 700px) 100vw, 50vw" />
        <div className={styles.heroCaption}><span>IN THE COLLECTION</span><strong>{hero.name} <span aria-hidden="true">↗</span></strong></div>
      </Link> : <div className={styles.heroVisual}><span className={styles.emptyHero}>Welcome to {storeConfig.brandName}</span></div>}
    </section>
    <nav className={styles.categoryRow} aria-label="Shop by category">{['Coconut Oils','Cold-Pressed Oils','Honey','Pantry Essentials'].map((category, i) => <Link key={category} href={'/products?category=' + encodeURIComponent(category)}><span>0{i + 1}</span>{category}<span aria-hidden="true">↗</span></Link>)}</nav>
    <section className={styles.collection} id="collection">
      <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>MADE FOR YOUR PANTRY</span><h2>Find your next kitchen favourite.</h2></div><Link href="/products">View all products <span aria-hidden="true">→</span></Link></div>
      {error ? <p>We couldn’t load the collection. Please try again shortly.</p> : products.length ? <div className={styles.productGrid}>{products.map(product => <ProductCard key={product.id} product={product} />)}</div> : <p>Our collection is coming soon. Check back for new arrivals.</p>}
    </section>
    <section className={styles.story} id="story"><span className={styles.eyebrow}>ROOTED IN KERALA</span><div><h2>Good food starts<br />with how it is made.</h2><p>Our coconut-oil story begins with fresh coconuts, controlled drying and mechanical extraction at Millco in Thennala, Kerala. It is a process worth knowing before you choose what goes into your kitchen.</p><a href="https://millco.in/" target="_blank" rel="noopener noreferrer">Explore our sourcing and process ↗</a></div></section>
    <section className={styles.quality}><div><span className={styles.eyebrow}>KNOW YOUR MAKER</span><h2>Care you can look into.</h2><p>Millco’s company website outlines its food-safety systems and registrations, including FSSAI, HACCP and GMP. Read the company information or ask our team for the documents relevant to your product.</p><a href="https://millco.in/" target="_blank" rel="noopener noreferrer">Company quality information ↗</a></div><div className={styles.qualityPoints}><p><strong>01 / A considered process</strong>Fresh-coconut sourcing and controlled processing.</p><p><strong>02 / Your size, your kitchen</strong>Compare smaller bottles and family packs.</p><p><strong>03 / A team you can reach</strong><a href={'mailto:' + tenantConfig.contact.supportEmail}>Talk to Millco about ingredients and sourcing.</a></p></div></section>
    <section className={styles.serviceRow} aria-label="Shopping information"><div><span>01</span><strong>Free delivery from ₹1,000</strong><p>₹50 shipping below ₹1,000. Delivery across India.</p></div><div><span>02</span><strong>Secure checkout</strong><p>Payments are handled through Razorpay.</p></div><div><span>03</span><strong>Here to help</strong><p><a href={'mailto:' + tenantConfig.contact.supportEmail}>Get in touch with our store.</a></p></div></section>
  </div>
}
