import { useEffect, useState } from 'react'

/** Sequential wave reveal of pixel indices for canvas diff animation */
export function useDiffWave(
  indices: number[],
  active: boolean,
  intervalMs = 12,
): number[] {
  const [revealed, setRevealed] = useState<number[]>([])

  useEffect(() => {
    if (!active || indices.length === 0) return undefined

    let step = 0
    const timer = window.setInterval(() => {
      step += 1
      setRevealed(indices.slice(0, step))
      if (step >= indices.length) window.clearInterval(timer)
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [active, indices, intervalMs])

  if (!active || indices.length === 0) return []
  return revealed
}
