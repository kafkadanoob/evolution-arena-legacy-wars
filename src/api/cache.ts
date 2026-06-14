import { CACHE_TTL_MS } from '@/constants/api'

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs })
}

export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':')
}
