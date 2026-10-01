type CategorySource = {
  category: string | null
  subcategory: string | null
}

export type ManagedCategory = { id: string; name: string; parent_id: string | null; is_active: boolean }

export function buildFormOptions(products: CategorySource[], managed: ManagedCategory[] = []) {
  const categorySet = new Set<string>()
  const subcategoryMap = new Map<string, Set<string>>()

  for (const product of products) {
    const category = product.category?.trim()
    const subcategory = product.subcategory?.trim()
    if (!category) continue

    categorySet.add(category)

    if (!subcategory) continue
    if (!subcategoryMap.has(category)) {
      subcategoryMap.set(category, new Set<string>())
    }
    subcategoryMap.get(category)?.add(subcategory)
  }

  for (const category of managed.filter(item => item.is_active)) {
    if (!category.parent_id) { categorySet.add(category.name); continue }
    const parent = managed.find(item => item.id === category.parent_id && item.is_active)
    if (!parent) continue
    categorySet.add(parent.name)
    if (!subcategoryMap.has(parent.name)) subcategoryMap.set(parent.name, new Set<string>())
    subcategoryMap.get(parent.name)?.add(category.name)
  }

  const categoryOptions = Array.from(categorySet).sort((a, b) => a.localeCompare(b))
  const subcategoryOptionsByCategory: Record<string, string[]> = {}

  for (const category of categoryOptions) {
    subcategoryOptionsByCategory[category] = Array.from(
      subcategoryMap.get(category) ?? new Set<string>()
    ).sort((a, b) => a.localeCompare(b))
  }

  return {
    categoryOptions,
    subcategoryOptionsByCategory,
  }
}
