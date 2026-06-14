import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clampNormieId(id: number): number {
  return Math.max(0, Math.min(9999, Math.floor(id)))
}

export function isValidNormieId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && id >= 0 && id <= 9999
}
