import { useEffect, useRef } from 'react'

type PixelDot = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  pulse: number
  pulseSpeed: number
}

const DOT_COUNT = 140
const MOUSE_RADIUS = 160

export function PixelFieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let raf = 0
    let dots: PixelDot[] = []

    const createDot = (): PixelDot => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      size: Math.random() > 0.72 ? 4 : 3,
      alpha: 0.16 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.012 + Math.random() * 0.026,
    })

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      width = rect.width
      height = rect.height

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dots = Array.from({ length: DOT_COUNT }, createDot)
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const wash = ctx.createRadialGradient(
        width * 0.42,
        height * 0.42,
        0,
        width * 0.42,
        height * 0.42,
        Math.max(width, height) * 0.8,
      )
      wash.addColorStop(0, 'rgba(34, 197, 94, 0.09)')
      wash.addColorStop(0.42, 'rgba(34, 197, 94, 0.035)')
      wash.addColorStop(1, 'rgba(0, 0, 0, 0)')

      ctx.fillStyle = wash
      ctx.fillRect(0, 0, width, height)

      for (const dot of dots) {
        const dx = dot.x - mouseRef.current.x
        const dy = dot.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < MOUSE_RADIUS) {
          const force = (1 - dist / MOUSE_RADIUS) * 0.055
          dot.vx += (dx / Math.max(dist, 1)) * force
          dot.vy += (dy / Math.max(dist, 1)) * force
        }

        dot.vx += (Math.random() - 0.5) * 0.01
        dot.vy += (Math.random() - 0.5) * 0.01

        dot.x += dot.vx
        dot.y += dot.vy

        dot.vx *= 0.992
        dot.vy *= 0.992

        if (dot.x < -12) dot.x = width + 12
        if (dot.x > width + 12) dot.x = -12
        if (dot.y < -12) dot.y = height + 12
        if (dot.y > height + 12) dot.y = -12

        dot.pulse += dot.pulseSpeed

        const pulse = 0.35 + Math.sin(dot.pulse) * 0.28
        const alpha = dot.alpha + pulse * 0.28
        const pixelX = Math.round(dot.x / dot.size) * dot.size
        const pixelY = Math.round(dot.y / dot.size) * dot.size

        ctx.shadowBlur = 14 + pulse * 22
        ctx.shadowColor = 'rgba(34, 197, 94, 0.85)'
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`
        ctx.fillRect(pixelX, pixelY, dot.size, dot.size)
      }

      ctx.shadowBlur = 0
      raf = requestAnimationFrame(draw)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = event.clientX - rect.left
      mouseRef.current.y = event.clientY - rect.top
    }

    const handlePointerLeave = () => {
      mouseRef.current.x = -9999
      mouseRef.current.y = -9999
    }

    resize()
    draw()

    window.addEventListener('resize', resize)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-auto absolute inset-0 z-0 h-full w-full opacity-100"
      aria-hidden="true"
    />
  )
}