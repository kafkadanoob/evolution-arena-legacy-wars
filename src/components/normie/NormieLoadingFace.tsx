import { motion } from 'framer-motion'

/** Spinning 8x8 pixel face loader */
export function NormieLoadingFace({ size = 48 }: { size?: number }) {
  const cell = size / 8
  const pattern = [
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [1, 0, 1, 0, 0, 1, 0, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
  ]

  return (
    <motion.div
      className="inline-block"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading Normie"
    >
      <svg width={size} height={size} className="normie-canvas">
        {pattern.map((row, y) =>
          row.map((on, x) =>
            on ? (
              <rect
                key={`${x}-${y}`}
                x={x * cell}
                y={y * cell}
                width={cell}
                height={cell}
                fill="#00ff9f"
              />
            ) : null,
          ),
        )}
      </svg>
    </motion.div>
  )
}
