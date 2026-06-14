/**
 * NormieRenderer.tsx — v4 + pixelOverride patch
 *
 * ONE addition over the previous version:
 *   `pixelOverride?: string` prop on NormieRendererProps.
 *
 * When provided, the component skips useNormiePixels entirely and renders
 * the supplied 1600-char binary string directly. No network call is made.
 * Used by PixelDiffCard in ResultsScreen for the BEFORE/AFTER diff.
 *
 * Loading/rendering fixes:
 *   1. The normal loading state renders a stable square div matching the
 *      canvas dimensions instead of NormieLoadingFace.
 *   2. The canvas draws immediately when the canvas element attaches, so cards
 *      do not stay blank after loading when many cards mount at once.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GRID_SIZE } from '@/constants/api'
import { NORMIE_SCALE } from '@/constants/renderer'
import { getBurnedNormieImageUrl } from '@/api/normie'
import { useNormiePixels, type PixelSource } from '@/hooks/useNormiePixels'
import { coordToIndex } from '@/lib/pixels'
import { drawNormieGrid } from '@/lib/draw-normie-grid'
import { cn } from '@/lib/utils'
import { NormieLoadingFace } from '@/components/normie/NormieLoadingFace'
import { COLORS } from '@/constants/theme'

export interface NormieRendererProps {
  normieId: number
  scale?: number
  fit?: boolean
  source?: PixelSource
  className?: string
  showBorder?: boolean
  showGridLines?: boolean
  crtScanlines?: boolean
  scarIndices?: number[]
  showScars?: boolean
  scarColor?: string 
  highlightIndices?: number[]
  highlightCoords?: { x: number; y: number }[]
  highlightColor?: string
  flippingIndices?: number[]
  flipProgress?: number
  colorMode?: 'arena' | 'api'
  onPixelHover?: (coord: { x: number; y: number; index: number } | null) => void
  onClick?: () => void
  interactive?: boolean
  minimal?: boolean
  /**
   * When set, render this 1600-char binary pixel string directly instead of
   * fetching from the API. Used by the results screen before/after diff.
   */
  pixelOverride?: string
}

function prepareCanvas(
  canvas: HTMLCanvasElement,
  logicalSize: number,
): CanvasRenderingContext2D | null {
  const dpr = Math.ceil(window.devicePixelRatio ?? 1)
  const physical = logicalSize * dpr

  if (canvas.width !== physical || canvas.height !== physical) {
    canvas.width = physical
    canvas.height = physical
  }

  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) return null

  ctx.imageSmoothingEnabled = false
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  return ctx
}

function drawScarOverlay(
  ctx: CanvasRenderingContext2D,
  indices: number[],
  color: string,
) {
  if (!indices.length) return

  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = color

  for (const index of indices) {
    if (index < 0 || index >= GRID_SIZE * GRID_SIZE) continue

    const x = index % GRID_SIZE
    const y = Math.floor(index / GRID_SIZE)

    ctx.fillRect(x, y, 1, 1)
  }

  ctx.restore()
}

export function NormieRenderer({
  normieId,
  scale = 12,
  fit = false,
  source = 'composited',
  className,
  showBorder = true,
  showGridLines = false,
  crtScanlines = false,
  scarIndices = [],
  showScars = false,
  scarColor = 'rgba(248, 113, 113, 0.95)',
  highlightIndices = [],
  highlightCoords = [],
  highlightColor = COLORS.glow,
  flippingIndices = [],
  flipProgress = 0,
  colorMode = 'arena',
  onPixelHover,
  onClick,
  interactive = true,
  minimal = false,
  pixelOverride,
}: NormieRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [cssSize, setCssSize] = useState<number>(GRID_SIZE * Math.max(1, Math.floor(scale)))
  const [burnedReady, setBurnedReady] = useState(false)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const { state, grid, raw, error, isBurned, refetch } = useNormiePixels(normieId, source)

  useEffect(() => {
    if (!fit) {
      setCssSize(GRID_SIZE * Math.max(1, Math.floor(scale)))
      return
    }

    const el = wrapperRef.current
    if (!el) return

    const update = () => {
      const parent = el.parentElement ?? el
      const w = parent.clientWidth
      const h = parent.clientHeight || w
      const size = Math.min(w, h)

      if (size > 0) setCssSize(size)
    }

    update()

    const target = el.parentElement ?? el
    const ro = new ResizeObserver(update)
    ro.observe(target)

    return () => ro.disconnect()
  }, [fit, scale])

  const highlightSet = useRef(new Set<number>())
  useEffect(() => {
    const set = new Set<number>(highlightIndices)

    for (const c of highlightCoords) {
      set.add(coordToIndex(c.x, c.y))
    }

    highlightSet.current = set
  }, [highlightIndices, highlightCoords])

  const flipSet = useRef(new Set(flippingIndices))
  useEffect(() => {
    flipSet.current = new Set(flippingIndices)
  }, [flippingIndices])

  const drawFromGrid = useCallback(
    (overridePixelString?: string) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = prepareCanvas(canvas, GRID_SIZE)
      if (!ctx) return

      drawNormieGrid(ctx, {
        grid: overridePixelString ? undefined : (grid ?? undefined),
        pixelString: overridePixelString ?? (raw ?? undefined),
        colorMode,
        highlightIndices: highlightSet.current,
        highlightColor,
        hoverIndex,
        interactive,
        flipIndices: flipSet.current,
        flipProgress,
        showGridLines,
      })
            if (showScars) {
        drawScarOverlay(ctx, scarIndices, scarColor)
      }
    },
    [
      grid,
      raw,
      colorMode,
      highlightColor,
      hoverIndex,
      flipProgress,
      showGridLines,
      interactive,
      showScars,
      scarIndices,
      scarColor,
    ],
  )

  const setCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas
      if (!canvas) return

      if (pixelOverride) {
        drawFromGrid(pixelOverride)
        return
      }

      if (state === 'success' && grid) {
        drawFromGrid()
      }
    },
    [pixelOverride, state, grid, drawFromGrid],
  )

  useEffect(() => {
    if (pixelOverride) {
      drawFromGrid(pixelOverride)
      return
    }

    if (state !== 'success' || !grid) return

    drawFromGrid()
  }, [pixelOverride, state, drawFromGrid, grid, hoverIndex, highlightIndices, highlightCoords])

  useEffect(() => {
    if (pixelOverride) return
    if (!isBurned || state !== 'error') return

    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = prepareCanvas(canvas, GRID_SIZE)
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return

      ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE)
      ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE)
      setBurnedReady(true)
    }

    img.onerror = () => {
      if (!cancelled) setBurnedReady(false)
    }

    img.src = getBurnedNormieImageUrl(normieId, 'png')

    return () => {
      cancelled = true
      setBurnedReady(false)
    }
  }, [pixelOverride, isBurned, state, normieId])

  const handleMouse = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !onPixelHover) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID_SIZE)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID_SIZE)

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      const index = coordToIndex(x, y)
      setHoverIndex(index)
      onPixelHover({ x, y, index })
    } else {
      setHoverIndex(null)
      onPixelHover(null)
    }
  }

  const canvasStyle: CSSProperties = {
    width: cssSize,
    height: cssSize,
    imageRendering: 'pixelated',
    flexShrink: 0,
    display: 'block',
  }

  const showCanvas = pixelOverride
    ? true
    : (state === 'success' && !!grid) || (state === 'error' && isBurned && burnedReady)

  const outerStyle: CSSProperties = fit
    ? { width: '100%', height: '100%', position: 'relative' }
    : { width: cssSize, height: cssSize, flexShrink: 0 }

  const wrapper = (
    <div
      ref={fit ? wrapperRef : undefined}
      style={outerStyle}
      className={cn(
        fit ? 'flex items-center justify-center' : 'normie-canvas-wrap inline-flex items-center justify-center',
        !fit && showBorder && 'normie-canvas-wrap--bordered',
        fit && showBorder && 'normie-canvas-wrap--bordered',
        crtScanlines && 'crt-scanlines',
      )}
    >
      {showCanvas && (
        <canvas
          ref={setCanvasRef}
          width={GRID_SIZE}
          height={GRID_SIZE}
          className={cn('pixel-canvas', className)}
          style={canvasStyle}
          onMouseMove={handleMouse}
          onMouseLeave={() => {
            setHoverIndex(null)
            onPixelHover?.(null)
          }}
          onClick={onClick}
          role="img"
          aria-label={`Normie #${normieId}`}
        />
      )}
    </div>
  )

  return (
    <div className={cn('normie-renderer flex flex-col items-center', fit && 'w-full h-full')}>
      <AnimatePresence mode="wait">
        {pixelOverride && (
          <motion.div
            key="canvas-override"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className={cn(fit && 'w-full h-full')}
          >
            {wrapper}
          </motion.div>
        )}

        {!pixelOverride && state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn('flex flex-col items-center', fit && 'w-full')}
          >
            <div
              className={cn(
                'animate-pulse rounded-sm border border-arena-glow/50 bg-arena-panel/40 shadow-[0_0_10px_#22c55e33]',
                showBorder && 'normie-canvas-wrap--bordered',
              )}
              style={{
                width: fit ? '100%' : cssSize,
                height: fit ? undefined : cssSize,
                aspectRatio: '1 / 1',
              }}
              role="img"
              aria-label={`Loading Normie #${normieId}`}
            />

            {!minimal && (
              <span className="mt-2 font-pixel text-[8px] uppercase tracking-widest text-arena-muted">
                Summoning #{normieId}
              </span>
            )}
          </motion.div>
        )}

        {!pixelOverride && state === 'error' && !isBurned && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 rounded border border-arena-danger/40 p-4 text-center"
            style={{ width: cssSize, minHeight: cssSize }}
          >
            <p className="text-sm text-arena-danger">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="font-pixel text-[8px] uppercase text-arena-glow hover:underline"
            >
              Retry
            </button>
          </motion.div>
        )}

        {!pixelOverride && state === 'error' && isBurned && !burnedReady && (
          <motion.div
            key="burned-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ width: cssSize, height: cssSize }}
            className="flex items-center justify-center"
          >
            <NormieLoadingFace size={40} />
          </motion.div>
        )}

        {!pixelOverride && (state === 'success' || (isBurned && burnedReady)) && (
          <motion.div
            key="canvas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className={cn(fit && 'w-full h-full')}
          >
            {wrapper}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function NormieRendererWithMeta({
  normieId,
  scale = NORMIE_SCALE.hero,
  ...props
}: NormieRendererProps) {
  const [hover, setHover] = useState<{ x: number; y: number; index: number } | null>(null)

  return (
    <div className="flex flex-col items-center gap-2">
      <NormieRenderer
        normieId={normieId}
        scale={scale}
        onPixelHover={setHover}
        {...props}
      />
      {hover && (
        <p className="font-mono text-xs text-arena-muted">
          ({hover.x}, {hover.y}) · idx {hover.index}
        </p>
      )}
    </div>
  )
}