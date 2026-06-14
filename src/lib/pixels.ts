import { GRID_SIZE, PIXEL_STRING_LENGTH } from '@/constants/api'

/**
 * Parse Normies API 1600-char binary string (row-major, top-left → bottom-right).
 * '1' = pixel on, '0' = pixel off.
 */
export function parsePixelString(raw: string): boolean[][] {
  if (raw.length !== PIXEL_STRING_LENGTH) {
    throw new Error(
      `Invalid pixel string length: expected ${PIXEL_STRING_LENGTH}, got ${raw.length}`,
    )
  }

  const grid: boolean[][] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: boolean[] = []
    for (let x = 0; x < GRID_SIZE; x++) {
      const index = y * GRID_SIZE + x
      row.push(raw[index] === '1')
    }
    grid.push(row)
  }
  return grid
}

/** Linear index from grid coordinates */
export function coordToIndex(x: number, y: number): number {
  return y * GRID_SIZE + x
}

export function indexToCoord(index: number): { x: number; y: number } {
  return { x: index % GRID_SIZE, y: Math.floor(index / GRID_SIZE) }
}

/** XOR two pixel strings — authentic Normies canvas compositing */
export function xorPixelStrings(a: string, b: string): string {
  if (a.length !== b.length) {
    throw new Error('Pixel strings must be equal length for XOR')
  }
  let result = ''
  for (let i = 0; i < a.length; i++) {
    const bitA = a[i] === '1' ? 1 : 0
    const bitB = b[i] === '1' ? 1 : 0
    result += (bitA ^ bitB) === 1 ? '1' : '0'
  }
  return result
}

export function countActivePixels(grid: boolean[][]): number {
  return grid.flat().filter(Boolean).length
}

export function gridToPixelString(grid: boolean[][]): string {
  let s = ''
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      s += grid[y][x] ? '1' : '0'
    }
  }
  return s
}
