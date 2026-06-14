import { NORMIES_API_BASE } from '@/constants/api'
import { getCached, setCached, cacheKey } from '@/api/cache'

export class NormiesApiError extends Error {
  status: number
  endpoint: string

  constructor(message: string, status: number, endpoint: string) {
    super(message)
    this.name = 'NormiesApiError'
    this.status = status
    this.endpoint = endpoint
  }
}

interface FetchOptions {
  cache?: boolean
  cacheTtlMs?: number
}

async function normiesFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${NORMIES_API_BASE}${path}`

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json, text/plain, */*',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.clone().json()
      if (body && typeof body === 'object' && 'message' in body) {
        detail = String((body as { message: string }).message)
      }
    } catch {
      /* plain text or empty */
    }
    throw new NormiesApiError(detail, response.status, path)
  }

  return response
}

export async function fetchText(
  path: string,
  options?: FetchOptions,
): Promise<string> {
  const key = cacheKey('text', path)
  if (options?.cache !== false) {
    const hit = getCached<string>(key)
    if (hit) return hit
  }

  const res = await normiesFetch(path, undefined)
  const text = (await res.text()).trim()
  setCached(key, text, options?.cacheTtlMs)
  return text
}

export async function fetchJson<T>(
  path: string,
  options?: FetchOptions,
): Promise<T> {
  const key = cacheKey('json', path)
  if (options?.cache !== false) {
    const hit = getCached<T>(key)
    if (hit) return hit
  }

  const res = await normiesFetch(path, undefined)
  const data = (await res.json()) as T
  setCached(key, data, options?.cacheTtlMs)
  return data
}
