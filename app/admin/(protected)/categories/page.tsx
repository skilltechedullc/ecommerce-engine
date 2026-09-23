import { requireAdminPermission } from '@/lib/adminAuth'
import { fetchInternalApi } from '@/lib/server/internalApi'
import CategoriesClient from './CategoriesClient'

export default async function AdminCategoriesPage() {
  await requireAdminPermission('catalog:categories')
  const data = await fetchInternalApi<{
    categories: Array<{
      id: string
      name: string
      slug: string
      parent_id: string | null
      sort_order: number
      is_active: boolean
    }>
    productCategoryHints: Array<{ category: string | null; subcategory: string | null }>
  }>('/api/admin/categories')

  return <CategoriesClient categories={data.categories ?? []} productCategoryHints={data.productCategoryHints ?? []} />
}
