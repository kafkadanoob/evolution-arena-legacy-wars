import { useEffect, useRef } from 'react'
import { GRID_SIZE } from '@/constants/api'
import { displayPixels } from '@/constants/renderer'
import { getBurnedNormieImageUrl } from '@/api/normie'
import { cn } from '@/lib/utils'

interface NormieBurnedFallbackProps {
  normieId: number
  scale: number
  className?: string
  bordered?: boolean
}

/** Burned Normie — 40×40 canvas, explicit CSS upscale */
export function NormieBurnedFallback({
  normieId,
  scale,
  className,
  bordered = true,
}: NormieBurnedFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cssSize = displayPixels(scale)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    canvas.width = GRID_SIZE
    canvas.height = GRID_SIZE
    ctx.imageSmoothingEnabled = false

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE)
      ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE)
    }
    img.src = getBurnedNormieImageUrl(normieId, 'png')
  }, [normieId])

  return (
    <div
      className={cn(
        'normie-canvas-wrap inline-flex',
        bordered && 'normie-canvas-wrap--bordered',
        className,
      )}
    >
      <canvas
        ref={canvasRef}
        width={GRID_SIZE}
        height={GRID_SIZE}
        className="pixel-canvas"
        style={{
          width: `${cssSize}px`,
          height: `${cssSize}px`,
          imageRendering: 'pixelated',
        }}
        role="img"
        aria-label={`Burned Normie #${normieId}`}
      />
    </div>
  )
}
