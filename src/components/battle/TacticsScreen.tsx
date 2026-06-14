/**
 * TacticsScreen.tsx  v6
 *
 * Layout fix: all fighters above the fold, synergy as a horizontal bar.
 *
 * Changes from v5:
 *
 * LAYOUT:
 *   - All fighters (2–3) now render in a single grid-cols-3 row at the top.
 *     No more left/right split — every fighter gets exactly 1/3 of the width.
 *   - Synergy panel demoted from full-height center column → compact horizontal
 *     banner between the fighters row and the Enter Battle button.
 *     Banner shows synergy pills inline; "No synergy" ghost state when empty.
 *   - Stance tooltip now appears below the fighters row, above the synergy bar,
 *     as a full-width panel (was center column).
 *   - scale reduced from 8 → 6 so art fits in 1/3-width columns without
 *     overflowing on typical 1440px screens.
 *   - Removed leftFighters/rightFighters split logic — no longer needed.
 *
 * Everything else (header, button, contrast, animations) unchanged from v5.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Swords, Zap } from 'lucide-react'
import { NormieRenderer } from '@/components/normie/NormieRenderer'
import { cn } from '@/lib/utils'
import type { BattleFighter, Stance } from '@/types/battle.type'
import { STANCE_CONFIGS, SYNERGY_BONUSES } from '@/types/battle.type'

interface TacticsScreenProps {
  fighters: BattleFighter[]
  onConfirm: (stances: Record<number, Stance>) => void
}

const STANCE_ACTIVE: Record<Stance, string> = {
  aggressive: 'border-red-400/60  bg-red-400/10  text-red-300',
  defensive:  'border-blue-400/60 bg-blue-400/10 text-blue-300',
  balanced:   'border-[#22c55e]/60 bg-[#22c55e]/10 text-[#22c55e]',
}

const STANCE_HOVER: Record<Stance, string> = {
  aggressive: 'hover:border-red-400/30  hover:bg-red-400/5  hover:text-red-300',
  defensive:  'hover:border-blue-400/30 hover:bg-blue-400/5 hover:text-blue-300',
  balanced:   'hover:border-[#22c55e]/30 hover:bg-[#22c55e]/5 hover:text-[#22c55e]',
}

// ─── Fighter Column ───────────────────────────────────────────────────────────

interface FighterColumnProps {
  fighter: BattleFighter
  index: number
  currentStance: Stance
  onStanceChange: (stance: Stance) => void
  onHover: (val: { id: number; stance: Stance } | null) => void
}

function FighterColumn({
  fighter,
  index,
  currentStance,
  onStanceChange,
  onHover,
}: FighterColumnProps) {
  const stanceCfg = STANCE_CONFIGS[currentStance]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex flex-col items-center gap-3"
    >
      {/* Fighter ID */}
      <div className="text-center">
        <p
          className="font-pixel text-2xl text-white"
          style={{ textShadow: '0 0 12px rgba(255,255,255,0.3)' }}
        >
          #{fighter.id}
        </p>
        {fighter.agentPersona && (
          <p
            className="mt-0.5 font-mono text-xs font-bold uppercase tracking-[2px] text-[#22c55e]"
            style={{ textShadow: '0 0 8px #22c55e66' }}
          >
            {fighter.agentPersona.name}
          </p>
        )}
      </div>

      {/* Art frame — fixed size so all fighters render identically */}
      <motion.div
        className="relative flex h-[240px] w-[240px] shrink-0 items-center justify-center overflow-hidden rounded-xl transition-all duration-200"
        style={{
          border: `2px solid ${
            currentStance === 'aggressive' ? 'rgba(248,113,113,0.5)'
            : currentStance === 'defensive' ? 'rgba(96,165,250,0.5)'
            : 'rgba(34,197,94,0.5)'
          }`,
          backgroundColor: '#0d0d0d',
        }}
        animate={{
          boxShadow:
            currentStance === 'aggressive'
              ? ['0 0 12px #f8717133', '0 0 28px #f8717166', '0 0 12px #f8717133']
              : currentStance === 'balanced'
              ? ['0 0 10px #22c55e22', '0 0 24px #22c55e55', '0 0 10px #22c55e22']
              : ['0 0 10px #60a5fa22', '0 0 20px #60a5fa44', '0 0 10px #60a5fa22'],
        }}
        transition={{ repeat: Infinity, duration: 2.4 }}
      >
        <NormieRenderer
          normieId={fighter.id}
          scale={6}
          showBorder={false}
          interactive={false}
          minimal
        />
      </motion.div>

      {/* Current stance label */}
      <p
        className={cn(
          'font-mono text-[10px] font-bold uppercase tracking-[2px]',
          stanceCfg.color,
        )}
        style={{ textShadow: '0 0 8px currentColor' }}
      >
        {stanceCfg.label}
      </p>

      {/* Stance buttons */}
      <div className="flex w-full max-w-[180px] flex-col gap-1.5">
        {(Object.keys(STANCE_CONFIGS) as Stance[]).map((stance) => {
          const cfg    = STANCE_CONFIGS[stance]
          const active = currentStance === stance
          return (
            <button
              key={stance}
              type="button"
              onClick={() => onStanceChange(stance)}
              onMouseEnter={() => onHover({ id: fighter.id, stance })}
              onMouseLeave={() => onHover(null)}
              className={cn(
                'flex items-center justify-between rounded border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wide transition-all duration-150',
                active
                  ? cn('font-bold', STANCE_ACTIVE[stance])
                  : cn('border-[#2a2a2a] text-[#ccc]', STANCE_HOVER[stance]),
              )}
            >
              <span>{cfg.label}</span>
              {active && <Check className="h-3 w-3 shrink-0" />}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Synergy Bar (horizontal) ─────────────────────────────────────────────────

interface SynergyBarProps {
  activeSynergies: typeof SYNERGY_BONUSES
}

function SynergyBar({ activeSynergies }: SynergyBarProps) {
  const hasActive = activeSynergies.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className={cn(
        'relative flex items-center gap-4 overflow-hidden rounded-xl border px-5 py-3',
        hasActive
          ? 'border-[#22c55e55] bg-[#050f05]'
          : 'border-[#ffffff0f] bg-[#0a0a0a]',
      )}
    >
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)',
        }}
      />

      {/* Label */}
      <div className="relative flex shrink-0 items-center gap-2">
        <Zap className={cn('h-3.5 w-3.5', hasActive ? 'text-[#22c55e]' : 'text-[#333]')} />
        <span
          className={cn(
            'font-mono text-[10px] font-bold uppercase tracking-[2px]',
            hasActive ? 'text-[#22c55e]' : 'text-[#444]',
          )}
          style={hasActive ? { textShadow: '0 0 8px #22c55e66' } : undefined}
        >
          Squad Synergies
        </span>
      </div>

      {/* Divider */}
      <div className={cn('relative h-4 w-px shrink-0', hasActive ? 'bg-[#22c55e33]' : 'bg-[#1a1a1a]')} />

      {/* Synergy pills or empty state */}
      <div className="relative flex flex-1 flex-wrap items-center gap-3">
        {hasActive ? (
          activeSynergies.map((syn) => (
            <motion.div
              key={syn.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 rounded-md border border-[#22c55e33] bg-[#0a1f0a] px-3 py-1.5"
            >
              <span className="font-mono text-[10px] text-[#22c55e]">✦</span>
              <span className="font-mono text-[10px] font-bold text-[#22c55e]">{syn.name}</span>
              <span className="font-mono text-[9px] text-white opacity-80">— {syn.description}</span>
            </motion.div>
          ))
        ) : (
          <p className="font-mono text-[10px] text-[#333]">
            No synergy detected · Fighters with shared traits unlock squad bonuses
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ─── Stance Tooltip ───────────────────────────────────────────────────────────

function StanceTooltip({ stance }: { stance: Stance }) {
  return (
    <motion.div
      key={stance}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="relative overflow-hidden rounded-lg border-2 border-[#22c55e33] bg-[#0a0a0a] px-4 py-3"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.2) 2px,rgba(0,0,0,0.2) 4px)',
        }}
      />
      <p
        className={cn(
          'relative font-mono text-[10px] font-bold uppercase tracking-[1px]',
          STANCE_CONFIGS[stance].color,
        )}
      >
        {STANCE_CONFIGS[stance].label}
      </p>
      <p className="relative mt-1 font-mono text-xs text-white">
        {STANCE_CONFIGS[stance].tooltip}
      </p>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TacticsScreen({ fighters, onConfirm }: TacticsScreenProps) {
  const [stances, setStances] = useState<Record<number, Stance>>(
    Object.fromEntries(fighters.map((f) => [f.id, 'balanced' as Stance])),
  )
  const [hoveredStance, setHoveredStance] = useState<{
    id: number
    stance: Stance
  } | null>(null)

  const activeSynergies = SYNERGY_BONUSES.filter((s) => {
    const count = fighters.filter((f) =>
      f.traits.some((t) => String(t.value).toLowerCase().includes(s.traitKey)),
    ).length
    return count >= s.minCount
  })

  const tooltipStance = hoveredStance?.stance ?? null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 p-6"
    >
      {/* ── Dramatic Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-[#22c55e22] bg-[#050f05] px-8 py-5">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)',
          }}
        />
        <div className="pointer-events-none absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#22c55e66]" />
        <div className="pointer-events-none absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[#22c55e66]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[#22c55e66]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#22c55e66]" />

        <div className="relative flex items-center justify-between">
          <div>
            <p
              className="font-mono text-xs font-bold uppercase tracking-[4px] text-[#22c55e]"
              style={{ textShadow: '0 0 8px #22c55e66' }}
            >
              Evolution Arena · Legacy Wars
            </p>
            <h1
              className="mt-1 font-pixel text-4xl text-white"
              style={{
                textShadow: '0 0 20px rgba(255,255,255,0.2), 0 0 40px #22c55e33',
                letterSpacing: '0.06em',
              }}
            >
              ASSIGN YOUR TACTICS
            </h1>
            <p className="mt-1.5 font-mono text-sm text-[#ccc]">
              Choose a stance for each fighter. Stances determine attack and defense every round.
            </p>
          </div>

          <div
            className="flex flex-col items-center justify-center rounded-full border-2 border-[#22c55e55] bg-[#0a1a0a] px-6 py-4 text-center"
            style={{ boxShadow: '0 0 20px #22c55e22' }}
          >
            <p className="font-mono text-[9px] font-bold uppercase tracking-[2px] text-[#22c55e]">
              Fighters
            </p>
            <p
              className="font-pixel text-3xl text-white"
              style={{ textShadow: '0 0 12px rgba(255,255,255,0.4)' }}
            >
              {fighters.length}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[1px] text-[#555]">
              of 3 max
            </p>
          </div>
        </div>
      </div>

      {/* ── All fighters in one row ──────────────────────────────── */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${Math.max(fighters.length, 2)}, 1fr)` }}
      >
        {fighters.map((fighter, i) => (
          <FighterColumn
            key={fighter.id}
            fighter={fighter}
            index={i}
            currentStance={stances[fighter.id]}
            onStanceChange={(stance) =>
              setStances((s) => ({ ...s, [fighter.id]: stance }))
            }
            onHover={setHoveredStance}
          />
        ))}
      </div>

      {/* ── Stance tooltip (full-width, between fighters and synergy) ── */}
      <AnimatePresence>
        {tooltipStance && <StanceTooltip stance={tooltipStance} />}
      </AnimatePresence>

      {/* ── Synergy bar ─────────────────────────────────────────── */}
      <SynergyBar activeSynergies={activeSynergies} />

      {/* ── Full-width Enter Battle button ──────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow: '0 0 40px #22c55e33, 0 0 80px #22c55e11' }}
        />
        <button
          type="button"
          onClick={() => onConfirm(stances)}
          className={cn(
            'group relative w-full overflow-hidden rounded-xl border-2 border-[#22c55e] bg-[#050f05] px-8 py-5',
            'font-pixel text-xl text-white transition-all duration-200',
            'hover:bg-[#0a1f0a] hover:shadow-[0_0_40px_#22c55e55]',
            'active:scale-[0.99]',
          )}
          style={{ textShadow: '0 0 12px rgba(255,255,255,0.4)' }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)',
            }}
          />
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#22c55e11] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <div className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-[#22c55e]" />
          <div className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-[#22c55e]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-[#22c55e]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-[#22c55e]" />

          <span className="relative flex items-center justify-center gap-3">
            <Swords className="h-6 w-6 text-[#22c55e]" />
            CONFIRM TACTICS — ENTER BATTLE
            <Swords className="h-6 w-6 scale-x-[-1] text-[#22c55e]" />
          </span>
        </button>
      </motion.div>
    </motion.div>
  )
}