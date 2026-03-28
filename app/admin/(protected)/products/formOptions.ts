type CategorySource = {
  category: string | null
  subcategory: string | null
}

export function buildFormOptions(products: CategorySource[]) {
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
