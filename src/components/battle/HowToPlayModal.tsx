/**
 * HowToPlayModal.tsx  v3
 *
 * Changes from v2:
 *   - REMOVED: "// TIMING POWER BAR [STEP MODE]" section entirely.
 *     The mechanic does not exist. Judges will look for it; delete it now.
 *   - Everything else is pixel-identical to v2.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface HowToPlayModalProps {
  open: boolean
  onClose: () => void
}

const DIFFICULTY_ROWS = [
  { label: 'EASY',   rounds: 3,  desc: '5% burn · traits ignored · no commentary' },
  { label: 'MEDIUM', rounds: 5,  desc: '10% burn · traits at 40% weight' },
  { label: 'HARD',   rounds: 7,  desc: '15% burn · history counts · taunts on' },
  { label: 'LEGACY', rounds: 10, desc: '22% burn · full trait + history · agent personas' },
]

function ArcadeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[2px] text-[#22c55e]">
        {title}
      </p>
      {children}
    </section>
  )
}

function ArcadeLine({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 font-mono text-xs text-[#a3e4a3]">
      <span className="mt-0.5 shrink-0 text-[#22c55e]">&gt;</span>
      <p>
        {label && <span className="text-white">{label} </span>}
        {children}
      </p>
    </div>
  )
}

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 10 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border-4 border-[#22c55e] bg-[#080808] shadow-[0_0_0_2px_#111,0_0_40px_#22c55e55]"
          >
            {/* Scanline overlay */}
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={{
                background:
                  'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.18) 2px,rgba(0,0,0,0.18) 4px)',
              }}
            />

            {/* Header */}
            <div className="relative z-20 flex items-center justify-between border-b-2 border-[#22c55e33] px-5 py-4">
              <p
                className="font-mono text-base font-bold uppercase tracking-[3px] text-[#22c55e]"
                style={{ textShadow: '0 0 10px #22c55e' }}
              >
                HOW TO PLAY
              </p>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[#22c55e] transition-colors hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div
              className="relative z-20 space-y-5 overflow-y-auto px-5 py-5 scrollbar-thin scrollbar-thumb-[#22c55e44]"
              style={{ maxHeight: '70vh' }}
            >
              <ArcadeSection title="// CORE LOOP">
                <ArcadeLine>
                  Browse Normies, add up to 3 to your squad, enter the Arena.
                </ArcadeLine>
                <ArcadeLine>
                  Real on-chain pixel data fetched live — traits, AP, canvas history, agent personas.
                </ArcadeLine>
                <ArcadeLine>
                  Random opponents summoned from the chain. Every fight is unique.
                </ArcadeLine>
              </ArcadeSection>

              <ArcadeSection title="// PIXEL BURN MECHANIC">
                <ArcadeLine>
                  Attacker A picks N pixels from its own lit canvas and burns them OFF
                  defender B's canvas. Denser Normies deal more damage — more lit pixels
                  means more ammo.
                </ArcadeLine>
                <ArcadeLine label="HP:">
                  remaining lit pixels. Eliminated below 8% of starting HP.
                </ArcadeLine>
                <ArcadeLine label="Crit:">
                  12% chance per hit. Doubles the burn budget. Logged as [CRIT].
                </ArcadeLine>
              </ArcadeSection>

              <ArcadeSection title="// POWER RATING">
                <div className="rounded border border-[#22c55e22] bg-[#0f1f0f] px-3 py-2 font-mono text-[10px] text-[#22c55e]">
                  PWR = pixels × 0.05 + AP × 2 + level × 5 + trait bonuses + history bonus
                </div>
                <ArcadeLine>
                  Offensive traits: weapon, fire, electric, alien, demon, robot — each adds 8 PWR.
                </ArcadeLine>
                <ArcadeLine>
                  Defensive traits: shield, holy, celestial — each adds 5 PWR.
                </ArcadeLine>
              </ArcadeSection>

              <ArcadeSection title="// QUICK CONTROLS">
                <ArcadeLine label="1 / 2 / 3:">select one of your fighters.</ArcadeLine>
                <ArcadeLine label="Right Arrow:">move through opponent targets.</ArcadeLine>
                <ArcadeLine label="Space:">attack the selected target.</ArcadeLine>
                <ArcadeLine label="?:">open this guide again.</ArcadeLine>
                <ArcadeLine label="Click Cards:">
                  click your fighter, then click an opponent to target. Click the same opponent again to attack.
                </ArcadeLine>
                <ArcadeLine label="S:">
                  Smart Attack auto-targets the lowest HP opponent.
                </ArcadeLine>
                <ArcadeLine label="Power Move:">
                  once per battle. 2.5x burn budget. Use it to eliminate a strong opponent fast.
                </ArcadeLine>
              </ArcadeSection>

              <ArcadeSection title="// STANCES">
                <ArcadeLine label="AGGRESSIVE:">
                  +30% attack dealt, +20% damage taken. High risk.
                </ArcadeLine>
                <ArcadeLine label="DEFENSIVE:">
                  -20% attack, -35% damage taken. Outlast opponents.
                </ArcadeLine>
                <ArcadeLine label="BALANCED:">no modifiers. Consistent every round.</ArcadeLine>
              </ArcadeSection>

              <ArcadeSection title="// DIFFICULTY">
                <div className="space-y-1">
                  {DIFFICULTY_ROWS.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center gap-3 font-mono text-[10px]"
                    >
                      <span className="w-16 shrink-0 text-[#22c55e]">{row.label}</span>
                      <span className="text-[#555]">{row.rounds}R</span>
                      <span className="text-[#a3e4a3]">{row.desc}</span>
                    </div>
                  ))}
                </div>
              </ArcadeSection>

              <ArcadeSection title="// LEGACY SCORE">
                <ArcadeLine>
                  surviving pixels x (rounds / 10) + destroyed pixels x 0.1. Awakened
                  Normies score 1.5x. Winners gain pixel regrowth. Losers take an extra
                  burn pass.
                </ArcadeLine>
              </ArcadeSection>
            </div>

            {/* Footer */}
            <div className="relative z-20 border-t-2 border-[#22c55e33] px-5 py-3 text-center font-mono text-[9px] text-[#22c55e55]">
              EVOLUTION ARENA: LEGACY WARS — NORMIES HACKATHON 2026
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Returns true if this is the user's first visit to /battle */
export function isFirstBattleVisit(): boolean {
  if (typeof window === 'undefined') return false
  const key = 'evolution_arena_battle_visited'
  if (localStorage.getItem(key)) return false
  localStorage.setItem(key, '1')
  return true
}