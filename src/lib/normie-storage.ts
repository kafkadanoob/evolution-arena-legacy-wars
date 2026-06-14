const RECENT_KEY = 'evolution-arena:recent-normies'
const FAVORITES_KEY = 'evolution-arena:favorite-normies'
const MAX_RECENT = 12

export function getRecentNormieIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as number[]
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n) && n >= 0 && n <= 9999) : []
  } catch {
    return []
  }
}

export function pushRecentNormieId(id: number): void {
  const prev = getRecentNormieIds().filter((n) => n !== id)
  const next = [id, ...prev].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

export function getFavoriteNormieIds(): number[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as number[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toggleFavoriteNormieId(id: number): boolean {
  const favs = getFavoriteNormieIds()
  const exists = favs.includes(id)
  const next = exists ? favs.filter((n) => n !== id) : [...favs, id]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  return !exists
}
