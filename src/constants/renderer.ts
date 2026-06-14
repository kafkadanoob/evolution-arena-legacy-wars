import { GRID_SIZE } from '@/constants/api'

export const NORMIE_INTERNAL_SIZE = GRID_SIZE

/** Integer upscale: CSS size = 40 × scale pixels */
export const NORMIE_SCALE = {
  card: 12,
  cardMax: 14,
  preview: 22,
  previewMd: 20,
  previewSm: 18,
  hero: 24,
} as const

export function displayPixels(scale: number): number {
  return GRID_SIZE * Math.max(1, Math.floor(scale))
}
