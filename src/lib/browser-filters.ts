import type { NormieProfile } from '@/hooks/useNormieProfile'
import type { BrowserFilters } from '@/types/browser'

export function profileMatchesFilters(
  profile: Pick<
    NormieProfile,
    'traits' | 'canvasInfo' | 'isAwakened' | 'historyVersions' | 'isBurned'
  >,
  filters: BrowserFilters,
): boolean {
  if (profile.isBurned && filters.customizedOnly) return false

  if (filters.minActionPoints > 0) {
    const ap = profile.canvasInfo?.actionPoints ?? 0
    if (ap < filters.minActionPoints) return false
  }

  if (filters.customizedOnly && !profile.canvasInfo?.customized) return false

  if (filters.awakenedOnly && !profile.isAwakened) return false

  if (filters.hasCanvasHistory && profile.historyVersions.length === 0) return false

  const traitSearch = filters.traitSearch.trim().toLowerCase()

  if (traitSearch) {
    const attrs = profile.traits?.attributes ?? []
    const match = attrs.some((attr) => {
      const value = String(attr.value ?? '').toLowerCase()
      const traitType = String(attr.trait_type ?? '').toLowerCase()

      return value.includes(traitSearch) || traitType.includes(traitSearch)
    })

    if (!match) return false
  }

  return true
}