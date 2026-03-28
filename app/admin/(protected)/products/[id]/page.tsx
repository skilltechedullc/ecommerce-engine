import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProductForm from '../ProductForm'
import { fetchInternalApi } from '@/lib/server/internalApi'
import { buildFormOptions } from '../formOptions'
import type { Product, ProductVariant } from '@/types/catalog'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let payload: { product: Product & { product_variants: ProductVariant[] } }
  let productListPayload: {
    products: Array<{
      category: string | null
      subcategory: string | null
    }>
  }
  try {
    ;[payload, productListPayload] = await Promise.all([
      fetchInternalApi<{ product: Product & { product_variants: ProductVariant[] } }>(`/api/products/${id}`),
      fetchInternalApi<{
        products: Array<{
          category: string | null
          subcategory: string | null
        }>
      }>('/api/products/list'),
    ])
  } catch {
    notFound()
  }

  const product = payload.product
  const normalizedProduct: Product = {
    ...product,
    images: ((product as Product & { product_images?: Array<{ image_url: string; sort_order: number }> }).product_images ?? [])
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((item) => item.image_url),
  }
  const normalizedVariants: ProductVariant[] = (product.product_variants ?? []).map((variant) => {
    const variantImages = (variant as ProductVariant & { variant_images?: Array<{ image_url: string; sort_order: number }> }).variant_images ?? []
    return {
      ...variant,
      images: variantImages
        .sort((left, right) => left.sort_order - right.sort_order)
        .map((item) => item.image_url),
    }
  })
  const { categoryOptions, subcategoryOptionsByCategory } = buildFormOptions(productListPayload.products ?? [])

  return (
    <div className="admin-stack" style={{ maxWidth: '1120px' }}>
      <Link href="/admin/products" className="admin-backLink">
        ← Back to Products
      </Link>

      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Catalog</p>
        <h2 className="admin-sectionTitle">Edit Product</h2>
        <p className="admin-sectionText">Update merchandising, stock-bearing variants, and published state for {product.name}.</p>
      </section>

      <ProductForm
        mode="edit"
        product={normalizedProduct}
        variants={normalizedVariants}
        categoryOptions={categoryOptions}
        subcategoryOptionsByCategory={subcategoryOptionsByCategory}
      />
    </div>
  )
}
