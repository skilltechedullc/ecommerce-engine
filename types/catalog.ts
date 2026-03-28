export type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  category: string | null
  subcategory: string | null
  price: number | null
  stock: number | null
  images?: string[]
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type ProductVariant = {
  id: string
  product_id: string
  name?: string | null
  weight?: string | null
  price: number
  compare_at_price: number | null
  stock: number
  sku: string | null
  image: string | string[] | null
  images?: string[]
}

export type ProductWithVariants = Product & {
  product_variants: ProductVariant[]
}

export type ProductInput = {
  name: string
  slug: string
  description?: string | null
  image?: string | null
  images?: string[]
  category?: string | null
  subcategory?: string | null
  price?: number | null
  stock?: number | null
  is_active?: boolean
}

export type VariantInput = {
  name: string
  price: number
  compare_at_price?: number | null
  stock: number
  sku?: string | null
  image?: string | string[] | null
  images?: string[]
}
