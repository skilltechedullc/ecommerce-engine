import { fetchInternalApi } from '@/lib/server/internalApi'
import ProductsClient from './ProductsClient'

export default async function AdminProductsPage() {
  const { products } = await fetchInternalApi<{
    products: Array<{
      id: string
      name: string
      slug: string
      image: string | null
      category: string | null
      is_active: boolean
      product_variants: Array<{ price: number | null; compare_at_price: number | null; stock: number | null; image?: string | null }>
    }>
  }>('/api/products/list')

  return <ProductsClient products={products ?? []} />
}
