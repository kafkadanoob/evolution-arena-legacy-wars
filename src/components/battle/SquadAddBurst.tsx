/**
 * SquadAddBurst.tsx
 *
 * Self-contained +1 animation: scale bounce on the art + green +1 label
 * floating up + 8 pixel particles flying outward then fading.
 *
 * Usage:
 *   const [burst, setBurst] = useState(false)
 *   <SquadAddBurst trigger={burst} onDone={() => setBurst(false)} />
 *   onClick={() => { addToSquad(); setBurst(true) }}
 *
 * Fully Framer Motion — no canvas, lightweight, deterministic.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SquadAddBurstProps {
  /** Set to true to fire the animation. Reset to false in onDone. */
  trigger: boolean
  onDone: () => void
  className?: string
}

// 8 particles at equal angles
const PARTICLE_ANGLES = Array.from({ length: 8 }, (_, i) => (i / 8) * 360)

export function SquadAddBurst({ trigger, onDone, className }: SquadAddBurstProps) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!trigger) return
    setActive(true)
    const t = setTimeout(() => {
      setActive(false)
      onDone()
    }, 700)
    return () => clearTimeout(t)
  }, [trigger, onDone])

  return (
    <AnimatePresence>
      {active && (
        <div className={`pointer-events-none absolute inset-0 flex items-center justify-center ${className ?? ''}`}>
          {/* +1 label */}
          <motion.span
            initial={{ opacity: 1, y: 0, scale: 0.6 }}
            animate={{ opacity: 0, y: -48, scale: 1.2 }}
            exit={{}}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="absolute z-20 select-none font-mono text-xl font-bold text-[#22c55e]"
            style={{ textShadow: '0 0 12px #22c55e, 0 0 24px #22c55e88' }}
          >
            +1
          </motion.span>

          {/* Pixel particles */}
          {PARTICLE_ANGLES.map((angle, i) => {
            const rad = (angle * Math.PI) / 180
            const dist = 32 + (i % 3) * 12
            return (
              <motion.div
                key={i}
                className="absolute h-1.5 w-1.5 rounded-sm bg-[#22c55e]"
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos(rad) * dist,
                  y: Math.sin(rad) * dist,
                  opacity: 0,
                  scale: 0.3,
                }}
                transition={{ duration: 0.55, ease: 'easeOut', delay: i * 0.02 }}
              />
            )
          })}
        </div>
      )}
    </AnimatePresence>
  )
}