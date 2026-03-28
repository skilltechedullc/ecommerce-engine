'use client'

import Image from 'next/image'
import { useRef, useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { normalizeImageValue } from '@/lib/catalogMedia'
import type { Product, ProductVariant, ProductInput, VariantInput } from '@/types/catalog'

type Props = {
  mode: 'create' | 'edit'
  product?: Product
  variants?: ProductVariant[]
  categoryOptions?: string[]
  subcategoryOptionsByCategory?: Record<string, string[]>
}

type VariantForm = {
  name: string
  price: string
  compareAtPrice: string
  stock: string
  sku: string
  images: string[]
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function toVariantForm(variant?: ProductVariant): VariantForm {
  const images = (variant?.images ?? []).filter(Boolean)
  const fallbackImage = normalizeImageValue(variant?.image)
  return {
    name: variant?.name ?? variant?.weight ?? '',
    price: variant?.price?.toString() ?? '',
    compareAtPrice: variant?.compare_at_price?.toString() ?? '',
    stock: variant?.stock?.toString() ?? '',
    sku: variant?.sku ?? '',
    images: images.length > 0 ? images : fallbackImage,
  }
}

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Upload failed')
  return json.url as string
}

function ImageGalleryField({
  label,
  value,
  onChange,
  placeholder = 'https://…',
}: {
  label: string
  value: string[]
  onChange: (urls: string[]) => void
  placeholder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [manualUrl, setManualUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  function pushUrl(url: string) {
    const normalized = url.trim()
    if (!normalized) return
    if (value.includes(normalized)) return
    onChange([...value, normalized])
  }

  function removeAt(index: number) {
    onChange(value.filter((_, current) => current !== index))
  }

  function moveToCover(index: number) {
    if (index === 0) return
    const next = [...value]
    const [selected] = next.splice(index, 1)
    next.unshift(selected)
    onChange(next)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const url = await uploadImage(file)
      pushUrl(url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <label style={{ display: 'grid', gap: '6px', gridColumn: '1 / -1' }}>
      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{label}</span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          value={manualUrl}
          onChange={(e) => setManualUrl(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => {
            pushUrl(manualUrl)
            setManualUrl('')
          }}
          style={uploadButton}
        >
          + Add
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={uploadButton}
        >
          {uploading ? 'Uploading…' : '↑ Upload'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      {uploadError && (
        <span style={{ fontSize: '12px', color: '#B91C1C' }}>{uploadError}</span>
      )}
      {value.length > 0 && !uploadError && (
        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
          {value.map((url, index) => (
            <div key={`${url}-${index}`} style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '6px', background: '#fff' }}>
              <div style={{ width: '100%', aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
                <Image src={url} alt={`${label} ${index + 1}`} fill unoptimized style={{ objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button type="button" onClick={() => moveToCover(index)} style={smallButton} disabled={index === 0}>
                  {index === 0 ? 'Cover' : 'Set cover'}
                </button>
                <button type="button" onClick={() => removeAt(index)} style={smallDangerButton}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </label>
  )
}

export default function ProductForm({
  mode,
  product,
  variants = [],
  categoryOptions = [],
  subcategoryOptionsByCategory = {},
}: Props) {
  const router = useRouter()

  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    category: product?.category ?? '',
    subcategory: product?.subcategory ?? '',
    image: product?.image ?? '',
    description: product?.description ?? '',
    is_active: product?.is_active ?? true,
  })
  const [productImages, setProductImages] = useState<string[]>(() => {
    const images = (product?.images ?? []).filter(Boolean)
    if (images.length > 0) return images
    return product?.image ? [product.image] : []
  })
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')

  const [variantForms, setVariantForms] = useState<VariantForm[]>(
    variants.length > 0 ? variants.map((v) => toVariantForm(v)) : [toVariantForm()]
  )

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (slugTouched) return
    const nextSlug = slugify(form.name)
    setForm((prev) => ({ ...prev, slug: nextSlug }))
  }, [form.name, slugTouched])

  const normalizedCategory = form.category.trim().toLowerCase()
  const suggestedSubcategories = useMemo(() => {
    if (!normalizedCategory) {
      return Array.from(
        new Set(Object.values(subcategoryOptionsByCategory).flat())
      ).sort((a, b) => a.localeCompare(b))
    }

    const matchedCategory = Object.keys(subcategoryOptionsByCategory).find(
      (category) => category.trim().toLowerCase() === normalizedCategory
    )

    if (!matchedCategory) return []
    return subcategoryOptionsByCategory[matchedCategory] ?? []
  }, [normalizedCategory, subcategoryOptionsByCategory])

  const validVariants = useMemo(() => {
    return variantForms
      .map((variant) => ({
        name: variant.name.trim(),
        price: Number(variant.price),
        compare_at_price: variant.compareAtPrice.trim() ? Number(variant.compareAtPrice) : null,
        stock: Number(variant.stock),
        sku: variant.sku.trim() || null,
        images: variant.images.map((url) => url.trim()).filter(Boolean),
      }))
      .filter((variant) => {
        const hasValidCompareAt = variant.compare_at_price == null
          || (Number.isFinite(variant.compare_at_price) && variant.compare_at_price > variant.price)

        return variant.name
          && Number.isFinite(variant.price)
          && Number.isFinite(variant.stock)
          && hasValidCompareAt
      })
  }, [variantForms])

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const setVariantField = (index: number, key: keyof VariantForm, value: string | string[]) => {
    setVariantForms((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: value } as VariantForm
      return next
    })
  }

  const addVariant = () => {
    setVariantForms((prev) => [...prev, toVariantForm()])
  }

  const removeVariant = (index: number) => {
    setVariantForms((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.slug.trim()) {
      setError('Product name and slug are required.')
      return
    }

    if (validVariants.length === 0) {
      setError('Add at least one valid variant with name, price, and stock.')
      return
    }

    const payload: { product: ProductInput; variants: VariantInput[]; id?: string } = {
      product: {
        name: form.name.trim(),
        slug: form.slug.trim(),
        category: form.category.trim() || null,
        subcategory: form.subcategory.trim() || null,
        image: productImages[0] ?? null,
        images: productImages,
        description: form.description.trim() || null,
        is_active: form.is_active,
      },
      variants: validVariants.map((variant) => ({
        ...variant,
        image: variant.images[0] ?? null,
      })),
    }

    if (mode === 'edit' && product?.id) payload.id = product.id

    setSaving(true)

    try {
      const endpoint = mode === 'create' ? '/api/products/create' : '/api/products/update'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Request failed')

      router.push('/admin/products')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-formSections" style={{ maxWidth: '1120px' }}>
      <section className="admin-surface admin-formSection">
        <div className="admin-formSection__header">
          <div>
            <p className="admin-formSection__eyebrow">Basic Info</p>
            <h2 className="admin-formSection__title">Core product details</h2>
            <p className="admin-formSection__description">Set the identity, taxonomy, and primary merchandising copy for this product.</p>
          </div>

          <label className="admin-formCheckbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField('is_active', e.target.checked)}
            />
            Active product
          </label>
        </div>

        <div className="admin-formGrid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <Field label="Name">
            <input value={form.name} onChange={(e) => setField('name', e.target.value)} style={inputStyle} required />
          </Field>
          <Field label="Slug">
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                setField('slug', slugify(e.target.value))
              }}
              style={inputStyle}
              required
            />
            <span style={{ fontSize: '12px', color: 'var(--admin-text-soft)' }}>
              Used in the URL, for example: /products/{'{'}slug{'}'}
            </span>
          </Field>
          <Field label="Category">
            <input
              list="category-options"
              value={form.category}
              onChange={(e) => {
                setField('category', e.target.value)
                setField('subcategory', '')
              }}
              style={inputStyle}
              placeholder="Select existing or type new"
            />
            <datalist id="category-options">
              {categoryOptions.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Field>
          <Field label="Subcategory">
            <input
              list="subcategory-options"
              value={form.subcategory}
              onChange={(e) => setField('subcategory', e.target.value)}
              style={inputStyle}
              placeholder={form.category ? 'Select existing or type new' : 'Select a category first'}
            />
            <datalist id="subcategory-options">
              {suggestedSubcategories.map((subcategory) => (
                <option key={subcategory} value={subcategory} />
              ))}
            </datalist>
          </Field>
          <ImageGalleryField
            label="Product Gallery"
            value={productImages}
            onChange={setProductImages}
          />
          <Field label="Description" full>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              style={{ ...inputStyle, minHeight: '96px', resize: 'vertical' }}
            />
          </Field>
        </div>

        {productImages[0] && (
          <div style={{ marginTop: '18px' }}>
            <p className="admin-inputShell__label" style={{ marginBottom: '10px' }}>Preview</p>
            <div className="admin-imagePreview">
              <Image src={productImages[0]} alt={form.name || 'Product preview'} fill unoptimized style={{ objectFit: 'cover' }} />
            </div>
          </div>
        )}
      </section>

      <section className="admin-surface admin-formSection">
        <div className="admin-formSection__header">
          <div>
            <p className="admin-formSection__eyebrow">Variants</p>
            <h2 className="admin-formSection__title">Sellable configurations</h2>
            <p className="admin-formSection__description">Each variant carries its own pricing, stock, SKU, and optional image for merchandising clarity.</p>
          </div>

          <button type="button" onClick={addVariant} className="admin-button admin-button--secondary">
            + Add Variant
          </button>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          {variantForms.map((variant, index) => (
            <div key={index} className="admin-variantCard">
              <div className="admin-variantCard__header">
                <div>
                  <p className="admin-variantCard__title">Variant {index + 1}</p>
                  <p className="admin-sectionText" style={{ marginTop: '4px' }}>Structured pricing, inventory, and imagery for this option.</p>
                </div>

                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  disabled={variantForms.length <= 1}
                  className="admin-button admin-button--danger admin-button--small"
                  style={{
                    opacity: variantForms.length <= 1 ? 0.5 : 1,
                    cursor: variantForms.length <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Remove Variant
                </button>
              </div>

              <div className="admin-formGrid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                <Field label="Variant Name">
                  <input
                    value={variant.name}
                    onChange={(e) => setVariantField(index, 'name', e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. 500g / Standard"
                    required
                  />
                </Field>
                <Field label="SKU">
                  <input
                    value={variant.sku}
                    onChange={(e) => setVariantField(index, 'sku', e.target.value)}
                    style={inputStyle}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.price}
                    onChange={(e) => setVariantField(index, 'price', e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>
                <Field label="Real Price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.compareAtPrice}
                    onChange={(e) => setVariantField(index, 'compareAtPrice', e.target.value)}
                    style={inputStyle}
                    placeholder="Optional struck-through price"
                  />
                </Field>
                <Field label="Stock">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={variant.stock}
                    onChange={(e) => setVariantField(index, 'stock', e.target.value)}
                    style={inputStyle}
                    required
                  />
                </Field>
                <ImageGalleryField
                  label="Variant Gallery"
                  value={variant.images}
                  onChange={(urls) => setVariantField(index, 'images', urls)}
                  placeholder="Optional"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p style={{ color: '#B91C1C', margin: 0, fontSize: '14px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" disabled={saving} className="admin-button admin-button--primary">
          {saving ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Update Product'}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <label className="admin-inputShell" style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <span className="admin-inputShell__label">{label}</span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--admin-border-strong)',
  borderRadius: '14px',
  padding: '12px 14px',
  fontSize: '14px',
  color: 'var(--admin-text)',
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#FFFFFF',
}

const smallButton: React.CSSProperties = {
  border: '1px solid var(--admin-border-strong)',
  color: 'var(--admin-text)',
  background: '#FFFFFF',
  borderRadius: '10px',
  padding: '6px 8px',
  fontSize: '11px',
  cursor: 'pointer',
  width: '100%',
}

const smallDangerButton: React.CSSProperties = {
  border: '1px solid #FECACA',
  color: '#B91C1C',
  background: '#FFF5F5',
  borderRadius: '10px',
  padding: '6px 8px',
  fontSize: '11px',
  cursor: 'pointer',
  width: '100%',
}

const uploadButton: React.CSSProperties = {
  border: '1px solid var(--admin-border-strong)',
  color: 'var(--admin-text)',
  background: '#FFFFFF',
  borderRadius: '14px',
  padding: '12px 14px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
