export function normalizeImageValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized ? [normalized] : []
  }

  return []
}

export function mergeImageSources(...sources: unknown[]): string[] {
  return Array.from(new Set(sources.flatMap((source) => normalizeImageValue(source))))
}

export function firstImageFromSources(...sources: unknown[]): string | null {
  return mergeImageSources(...sources)[0] ?? null
}