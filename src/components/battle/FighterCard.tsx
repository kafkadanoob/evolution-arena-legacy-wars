/**
 * FighterCard.tsx  v2
 *
 * New: stance badge overlay, momentum indicator, golden particle burst on
 * power moves / crits (CSS animation, no canvas), screen-shake intensity
 * driven by impactLevel prop.
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NormieRenderer } from '@/components/normie/NormieRenderer'
import { useDiffWave } from '@/hooks/useDiffWave'
import { cn } from '@/lib/utils'
import type { BattleFighter, Stance } from '@/types/battle.type'
import { STANCE_CONFIGS } from '@/types/battle.type'

interface FighterCardProps {
  fighter: BattleFighter
  animateDamage?: boolean
  /** 0–1, drives shake magnitude */
  impactLevel?: number
  showParticles?: boolean
  className?: string
  scale?: number
}

const STANCE_BORDER: Record<Stance, string> = {
  aggressive: 'border-red-400/60',
  defensive:  'border-blue-400/60',
  balanced:   'border-arena-border',
}

function Particles() {
  // 8 gold particles that fly outward
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-yellow-400"
          style={{
            left: '50%',
            top: '50%',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((i / 8) * Math.PI * 2) * (40 + Math.random() * 30),
            y: Math.sin((i / 8) * Math.PI * 2) * (40 + Math.random() * 30),
            opacity: 0,
            scale: 0.3,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export function FighterCard({
  fighter,
  animateDamage = false,
  impactLevel = 0,
  showParticles = false,
  className,
  scale = 5,
}: FighterCardProps) {
  const hpPercent = Math.max(0, (fighter.hp / fighter.maxHp) * 100)

  const waveIndices = useDiffWave(
    fighter.lastDamagedIndices,
    animateDamage && fighter.lastDamagedIndices.length > 0,
    8,
  )

  const highlightCoords = useMemo(
    () => waveIndices.map((idx) => ({ x: idx % 40, y: Math.floor(idx / 40) })),
    [waveIndices],
  )

  // Shake magnitude scaled by impactLevel
  const shakeMag = Math.round(impactLevel * 6)
  const shakeSeq = shakeMag > 0
    ? [0, -shakeMag, shakeMag, -Math.round(shakeMag * 0.6), Math.round(shakeMag * 0.6), 0]
    : []

  const stanceCfg = STANCE_CONFIGS[fighter.stance]

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center gap-2',
        fighter.eliminated && 'opacity-40 grayscale',
        className,
      )}
      animate={shakeSeq.length > 0 ? { x: shakeSeq } : {}}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      {/* Canvas + overlays */}
      <div className={cn('relative rounded border-2 transition-colors', STANCE_BORDER[fighter.stance])}>
        <NormieRenderer
          normieId={fighter.id}
          scale={scale}
          showBorder={false}
          interactive={false}
          highlightCoords={highlightCoords}
          highlightColor="#00ff9f"
          minimal
        />

        {/* Gold particle burst on power moves / crits */}
        <AnimatePresence>
          {showParticles && <Particles />}
        </AnimatePresence>

        {/* Stance badge */}
        <div className={cn(
          'absolute bottom-1 left-1 rounded px-1 py-0.5 font-pixel text-[7px] uppercase tracking-wide backdrop-blur-sm',
          'bg-black/60',
          stanceCfg.color,
        )}>
          {fighter.stance[0].toUpperCase()}
        </div>

        {/* Momentum fire */}
        {fighter.momentum >= 2 && (
          <motion.div
            className="absolute right-1 top-1 font-mono text-[9px]"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.6 }}
          >
            🔥{fighter.momentum}
          </motion.div>
        )}

        {fighter.eliminated && (
          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/40">
            <span className="font-pixel text-[9px] uppercase tracking-widest text-arena-danger">
              Eliminated
            </span>
          </div>
        )}
      </div>

      {/* ID + agent name */}
      <div className="text-center">
        <p className="font-pixel text-[9px] text-arena-text">#{fighter.id}</p>
        {fighter.agentPersona && (
          <p className="text-[9px] text-arena-glow">{fighter.agentPersona.name}</p>
        )}
        <p className={cn('text-[8px]', stanceCfg.color)}>{stanceCfg.label}</p>
      </div>

      {/* HP bar */}
      <div className="w-full max-w-[120px]">
        <div className="mb-0.5 flex justify-between font-mono text-[8px] text-arena-muted">
          <span>HP</span>
          <span>{fighter.hp}/{fighter.maxHp}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-arena-border">
          <motion.div
            className={cn(
              'h-full rounded-full',
              hpPercent > 50 ? 'bg-arena-glow' : hpPercent > 20 ? 'bg-yellow-400' : 'bg-arena-danger',
            )}
            animate={{ width: `${hpPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 font-mono text-[8px] text-arena-muted">
        <span>LV{fighter.level}</span>
        <span>{fighter.actionPoints}AP</span>
        <span>PWR{fighter.power}</span>
      </div>
    </motion.div>
  )
}