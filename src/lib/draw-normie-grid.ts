import { GRID_SIZE } from '@/constants/api'
import { COLORS } from '@/constants/theme'
import { coordToIndex, parsePixelString } from '@/lib/pixels'
import type { PixelGrid } from '@/types/normie'

export interface DrawNormieGridOptions {
  grid?: PixelGrid
  /** 1600-char API string (0/1) — used when grid omitted */
  pixelString?: string
  colorMode?: 'arena' | 'api'
  highlightIndices?: Set<number>
  highlightColor?: string
  hoverIndex?: number | null
  interactive?: boolean
  flipIndices?: Set<number>
  flipProgress?: number
  showGridLines?: boolean
}

/** Draw 40×40 on a 40×40 canvas: one fillRect per pixel, smoothing off */
export function drawNormieGrid(
  ctx: CanvasRenderingContext2D,
  options: DrawNormieGridOptions,
): void {
  const {
    grid: gridIn,
    pixelString,
    colorMode = 'arena',
    highlightIndices = new Set(),
    highlightColor = COLORS.glow,
    hoverIndex = null,
    interactive = true,
    flipIndices = new Set(),
    flipProgress = 0,
    showGridLines = false,
  } = options

  const grid = gridIn ?? (pixelString ? parsePixelString(pixelString) : null)
  if (!grid) return

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE)

  const bg = colorMode === 'api' ? COLORS.pixelApiOff : COLORS.background
  const onColor = colorMode === 'api' ? COLORS.pixelApiOn : COLORS.pixelOn
  const offColor = colorMode === 'api' ? COLORS.pixelApiOff : COLORS.pixelOff

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE)

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const index = coordToIndex(x, y)
      let on = grid[y][x]

      if (flipIndices.has(index)) {
        on = flipProgress > 0.5 ? !on : on
      }

      const isHighlight = highlightIndices.has(index)
      const isHover = hoverIndex === index

      if (isHover && interactive) {
        ctx.fillStyle = on ? COLORS.glow : COLORS.pixelOff
      } else if (on) {
        ctx.fillStyle = isHighlight ? highlightColor : onColor
      } else {
        ctx.fillStyle = offColor
      }

      ctx.fillRect(x, y, 1, 1)

      if (showGridLines) {
        ctx.strokeStyle = COLORS.border
        ctx.strokeRect(x + 0.5, y + 0.5, 1, 1)
      }
    }
  }
}
