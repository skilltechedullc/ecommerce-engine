'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Category = {
  id: string
  name: string
  slug: string
  parent_id: string | null
  sort_order: number
  is_active: boolean
}

type ProductCategoryHint = {
  category: string | null
  subcategory: string | null
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function CategoriesClient({
  categories,
  productCategoryHints,
}: {
  categories: Category[]
  productCategoryHints: ProductCategoryHint[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const discovered = useMemo(() => {
    const values = new Set<string>()
    for (const row of productCategoryHints) {
      if (row.category?.trim()) values.add(row.category.trim())
      if (row.subcategory?.trim()) values.add(`${row.category ?? 'Uncategorized'} / ${row.subcategory.trim()}`)
    }
    return Array.from(values).sort((left, right) => left.localeCompare(right))
  }, [productCategoryHints])

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug: slugify(name),
          parent_id: parentId || null,
          is_active: true,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Category save failed')
      setName('')
      setParentId('')
      setMessage('Category saved.')
      router.refresh()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Category save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-stack">
      <section className="admin-surface admin-toolbarCard">
        <div>
          <p className="admin-sectionEyebrow">Catalog structure</p>
          <h2 className="admin-sectionTitle">Categories and subcategories</h2>
          <p className="admin-sectionText">Create reusable category labels before adding or bulk-editing products.</p>
        </div>
        <form onSubmit={saveCategory} className="admin-filterGrid">
          <label className="admin-inputShell admin-inputShell--compact">
            <span className="admin-inputShell__label">Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Fruits, Oils, Snacks" required />
          </label>
          <label className="admin-inputShell admin-inputShell--compact">
            <span className="admin-inputShell__label">Parent</span>
            <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
              <option value="">Top-level category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <button className="admin-button admin-button--primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Category'}
          </button>
        </form>
        {message ? <p className="admin-inlineMessage admin-inlineMessage--success">{message}</p> : null}
        {error ? <p className="admin-inlineMessage admin-inlineMessage--error">{error}</p> : null}
      </section>

      <section className="admin-surface admin-tableCard">
        <div className="admin-tableWrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td>{category.name}</td>
                  <td>{category.slug}</td>
                  <td>{categories.find((item) => item.id === category.parent_id)?.name ?? 'Top level'}</td>
                  <td>{category.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-surface">
        <p className="admin-sectionEyebrow">Discovered from products</p>
        <h2 className="admin-sectionTitle">Existing labels</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
          {discovered.map((item) => (
            <span key={item} className="admin-badge admin-badge--neutral">{item}</span>
          ))}
        </div>
      </section>
    </div>
  )
}
