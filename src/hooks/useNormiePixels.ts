/**
 * useNormiePixels.ts
 *
 * Changes from previous version:
 *   1. Initial state: 'idle' → 'loading' (blank card fix — already shipped,
 *      preserved here)
 *   2. Logo/placeholder card fix: after a successful fetch, count lit pixels
 *      in the raw string. If fewer than MIN_LIT_PIXELS, the Normie is
 *      effectively empty (logo placeholder or near-burned). Treat as burned
 *      so NormieRenderer shows the archived image fallback instead of a
 *      near-invisible or logo-only canvas.
 */

import { useCallback, useEffect, useState } from 'react'
import { NormiesApiError } from '@/api/client'
import {
  getNormieCanvasPixels,
  getNormieOriginalPixels,
  getNormiePixels,
} from '@/api/normie'
import { parsePixelString } from '@/lib/pixels'
import { clampNormieId } from '@/lib/utils'
import type { PixelGrid, NormieLoadState } from '@/types/normie'

export type PixelSource = 'composited' | 'original' | 'canvas-layer'

export interface UseNormiePixelsResult {
  state: NormieLoadState
  grid: PixelGrid | null
  raw: string | null
  error: string | null
  isBurned: boolean
  refetch: () => void
}

// Below this many lit pixels, the canvas is effectively empty (logo/placeholder).
// Matches the battle arena's elimination threshold (8% of 1600 = 128, but we
// use a much lower floor — 8 pixels — to only catch true placeholders).
const MIN_LIT_PIXELS = 8

export function useNormiePixels(
  normieId: number,
  source: PixelSource = 'composited',
): UseNormiePixelsResult {
  const id = clampNormieId(normieId)

  // 'loading' initial state so skeleton shows immediately on mount (not blank)
  const [state, setState] = useState<NormieLoadState>('loading')
  const [grid, setGrid] = useState<PixelGrid | null>(null)
  const [raw, setRaw] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBurned, setIsBurned] = useState(false)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setState('loading')
      setError(null)
      setIsBurned(false)

      try {
        let pixelString: string

        if (source === 'original') {
          pixelString = await getNormieOriginalPixels(id)
        } else if (source === 'canvas-layer') {
          pixelString = await getNormieCanvasPixels(id)
        } else {
          try {
            pixelString = await getNormiePixels(id)
          } catch (e) {
            if (e instanceof NormiesApiError && e.status === 404) {
              if (!cancelled) {
                setIsBurned(true)
                setState('error')
                setError('Burned Normie — showing archived image')
              }
              return
            }
            throw e
          }
        }

        if (cancelled) return

        // Logo/placeholder guard: count lit pixels in the returned string.
        // A real Normie has hundreds of lit pixels. The logo placeholder and
        // near-empty canvases have very few. Treat these as burned so the
        // archived image fallback renders instead of a blank/logo square.
        const litCount = pixelString.split('').filter((c) => c === '1').length
        if (litCount < MIN_LIT_PIXELS) {
          setIsBurned(true)
          setState('error')
          setError('Burned Normie — showing archived image')
          return
        }

        const parsed = parsePixelString(pixelString)
        setRaw(pixelString)
        setGrid(parsed)
        setState('success')
      } catch (e) {
        if (cancelled) return
        const message =
          e instanceof NormiesApiError
            ? e.status === 404
              ? 'Normie not found or burned beyond recovery'
              : e.message
            : e instanceof Error
              ? e.message
              : 'Failed to load pixels'
        setError(message)
        setGrid(null)
        setRaw(null)
        setState('error')
      }
    }

    load()
    return () => { cancelled = true }
  }, [id, source, tick])

  return { state, grid, raw, error, isBurned, refetch }
}