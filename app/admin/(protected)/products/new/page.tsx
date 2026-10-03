import { requireAdminPermission } from '@/lib/adminAuth'
import Link from 'next/link'
import ProductForm from '../ProductForm'
import { fetchInternalApi } from '@/lib/server/internalApi'
import { buildFormOptions, type ManagedCategory } from '../formOptions'

export default async function NewProductPage() {
  await requireAdminPermission('products:create')
  const { products } = await fetchInternalApi<{
    products: Array<{
      category: string | null
      subcategory: string | null
    }>
  }>('/api/products/list')

  const { categories } = await fetchInternalApi<{ categories: ManagedCategory[] }>('/api/admin/categories')
  const { categoryOptions, subcategoryOptionsByCategory } = buildFormOptions(products ?? [], categories ?? [])

  return (
    <div className="admin-stack" style={{ maxWidth: '1120px' }}>
      <Link href="/admin/products" className="admin-backLink">
        ← Back to Products
      </Link>


      <ProductForm
        mode="create"
        categoryOptions={categoryOptions}
        subcategoryOptionsByCategory={subcategoryOptionsByCategory}
      />
    </div>
  )
}
