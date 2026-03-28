import Link from 'next/link'
import ProductForm from '../ProductForm'
import { fetchInternalApi } from '@/lib/server/internalApi'
import { buildFormOptions } from '../formOptions'

export default async function NewProductPage() {
  const { products } = await fetchInternalApi<{
    products: Array<{
      category: string | null
      subcategory: string | null
    }>
  }>('/api/products/list')

  const { categoryOptions, subcategoryOptionsByCategory } = buildFormOptions(products ?? [])

  return (
    <div className="admin-stack" style={{ maxWidth: '1120px' }}>
      <Link href="/admin/products" className="admin-backLink">
        ← Back to Products
      </Link>

      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Catalog</p>
        <h2 className="admin-sectionTitle">Create Product</h2>
        <p className="admin-sectionText">Build out core product information, upload imagery, and define purchasable variants.</p>
      </section>

      <ProductForm
        mode="create"
        categoryOptions={categoryOptions}
        subcategoryOptionsByCategory={subcategoryOptionsByCategory}
      />
    </div>
  )
}
