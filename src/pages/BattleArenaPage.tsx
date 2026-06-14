/**
 * BattleArenaPage.tsx  v7
 *
 * Changes from v6:
 *   - Step mode redesigned: no scrolling, no separate picker panel
 *   - attackerId / defenderId / isPowerMove selection state lifted to page level
 *   - Player fighter cards are directly clickable to set attacker (phase awaiting_input)
 *   - Opponent fighter cards are directly clickable to set target AND fire immediately
 *   - StepAttackPicker replaced with StepActionBar — slim pinned strip showing
 *     status text, damage preview chip, power move toggle, and "Let Them Fight" button
 *   - "Let Them Fight" hands off to broadcast auto mode mid-battle
 *   - Keyboard shortcuts (1/2/3, arrows, space, S) moved to page-level useEffect
 *   - All other phases, broadcast mode, results screen unchanged
 */

import { useCallback, useMemo, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ChevronRight, ChevronLeft,
  Play, Pause, RotateCcw, Zap, Swords,
  HelpCircle, FastForward, Radio,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { NormieRenderer } from '@/components/normie/NormieRenderer'
import { useNormieSelection } from '@/hooks/useNormieSelection'
import {
  getNormiePixels, getNormieTraits, getNormieCanvasInfo,
  getNormieHistoryVersions, getNormieAgentPersona,
} from '@/api/normie'

import { useBattleStore } from '../stores/useBattleStore'
import { FighterCard } from '../components/battle/FighterCard'
import { BattleLog } from '../components/battle/BattleLog'
import { HowToPlayModal, isFirstBattleVisit } from '../components/battle/HowToPlayModal'
import { TacticsScreen } from '../components/battle/TacticsScreen'
import {
  buildFighter, pickOpponentIds,
  runBattleSimulation, executeOneTurn,
  computeDamagePreview, detectSynergies,
} from '../utils/battleSimulator'
import { DIFFICULTY_CONFIGS } from '../types/battle.type'
import { submitBattleResult } from '@/api/legacy'
import type {
  BattleFighter, Difficulty, DifficultyConfig,
  DamagePreview, TurnAction, Stance,
} from '../types/battle.type'
import type { NormieProfile } from '@/hooks/useNormieProfile'
import { buildBattleSeed } from '../utils/SeededRandom'
import { useBattleAudio } from '../hooks/useAudio'

// ─── Timing ──────────────────────────────────────────────────────────────────

const AUTO_INTERVAL_MS: Record<Difficulty, number> = {
  easy: 1400, medium: 1200, hard: 900, legacy: 700,
}
const FAST_FORWARD_MS = 80
const BROADCAST_PAUSE_MS = 2800

// ─── API loader ───────────────────────────────────────────────────────────────

async function loadFighterData(id: number): Promise<{
  pixels: string
  profile: Partial<NormieProfile> & { id: number }
}> {
  const [pixelsRes, traitsRes, canvasRes, historyRes, personaRes] =
    await Promise.allSettled([
      getNormiePixels(id), getNormieTraits(id),
      getNormieCanvasInfo(id), getNormieHistoryVersions(id),
      getNormieAgentPersona(id),
    ])
  const pixels = pixelsRes.status === 'fulfilled' ? pixelsRes.value : '0'.repeat(1600)
  const persona = personaRes.status === 'fulfilled' ? personaRes.value : null
  const agentName = persona && typeof persona.name === 'string' ? persona.name : null
  return {
    pixels,
    profile: {
      id, agentName,
      traits: traitsRes.status === 'fulfilled' ? traitsRes.value : null,
      canvasInfo: canvasRes.status === 'fulfilled' ? canvasRes.value : null,
      historyVersions: historyRes.status === 'fulfilled' ? historyRes.value : [],
      isAwakened: agentName != null,
      isBurned: pixelsRes.status === 'rejected',
      state: 'success', canvasDiff: null, owner: null,
      metadata: null, pixelCount: null, error: null, refetch: () => {},
    },
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function FighterSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className="rounded border border-arena-border bg-arena-border/20"
        style={{ width: 200, height: 200 }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 1.4 }}
      />
      <div className="h-3 w-16 rounded bg-arena-border/30" />
      <motion.p
        className="font-pixel text-[9px] uppercase tracking-widest text-arena-glow"
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ repeat: Infinity, duration: 1.2 }}
      >
        Loading from chain…
      </motion.p>
    </div>
  )
}

// ─── Difficulty selector ──────────────────────────────────────────────────────

const DIFF_DESCS: Record<Difficulty, string> = {
  easy:   '3 rounds | low burn | no taunts',
  medium: '5 rounds | balanced | traits matter',
  hard:   '7 rounds | high burn | history counts',
  legacy: '10 rounds | brutal | agent personas',
}

function DifficultySelector({ value, onChange, disabled }: {
  value: Difficulty; onChange: (d: Difficulty) => void; disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1 rounded-lg border border-arena-border p-1">
        {(['easy', 'medium', 'hard', 'legacy'] as Difficulty[]).map((d) => (
          <button key={d} type="button" disabled={disabled} onClick={() => onChange(d)}
            className={`rounded px-2 py-1.5 font-pixel text-[8px] uppercase tracking-wide transition-colors sm:px-3 sm:text-[9px] sm:tracking-widest
              disabled:cursor-not-allowed disabled:opacity-40
              ${value === d ? 'bg-arena-glow/15 text-arena-glow' : 'text-arena-muted hover:text-arena-text'}`}>
            {DIFFICULTY_CONFIGS[d].label}
          </button>
        ))}
      </div>
      <p className="text-center font-mono text-[9px] text-arena-muted">{DIFF_DESCS[value]}</p>
    </div>
  )
}

// ─── Broadcast callout ────────────────────────────────────────────────────────

type BroadcastEvent = {
  text: string
  type: 'crit' | 'elimination' | 'powermove' | 'round'
}

function BroadcastCallout({ event, onResume, onPowerMove, onSkip, powerMoveAvailable }: {
  event: BroadcastEvent
  onResume: () => void
  onPowerMove: () => void
  onSkip: () => void
  powerMoveAvailable: boolean
}) {
  const borderColor = event.type === 'elimination' ? 'border-arena-danger/60'
    : event.type === 'powermove' ? 'border-yellow-400/60' : 'border-arena-glow/60'
  const textColor = event.type === 'elimination' ? 'text-arena-danger'
    : event.type === 'powermove' ? 'text-yellow-400' : 'text-arena-glow'
  const bgColor = event.type === 'elimination' ? 'bg-arena-danger/5'
    : event.type === 'powermove' ? 'bg-yellow-400/5' : 'bg-arena-glow/5'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border px-5 py-4 ${borderColor} ${bgColor}`}
    >
      <p className={`font-pixel text-sm uppercase tracking-widest ${textColor}`}
        style={event.type !== 'elimination' ? { textShadow: '0 0 12px currentColor' } : undefined}>
        {event.text}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="glow" size="sm" onClick={onResume}>
          <Play className="h-3.5 w-3.5" />Resume
        </Button>
        {powerMoveAvailable && (
          <Button variant="outline" size="sm" onClick={onPowerMove}
            className="border-yellow-400/40 text-yellow-400 hover:border-yellow-400/70">
            <Zap className="h-3.5 w-3.5" />Use Power Move
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onSkip} className="ml-auto text-arena-muted hover:text-arena-text">
          Skip to results
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Damage preview chip ──────────────────────────────────────────────────────

function ArcadeKey({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded border border-arena-border bg-[#101010] px-1.5 py-0.5 font-pixel text-[8px] text-white shadow-[inset_0_-2px_0_#000,0_0_8px_#22c55e22]">
      {children}
    </span>
  )
}

function DamagePreviewChip({ preview }: { preview: DamagePreview | null }) {
  if (!preview) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex flex-wrap items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-xs ${
        preview.isPowerMove
          ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400'
          : 'border-arena-glow/30 bg-arena-glow/5 text-arena-glow'
      }`}
    >
      {preview.isPowerMove && (
        <span className="font-pixel text-[8px] uppercase tracking-wide">POWER</span>
      )}
      Burn: {preview.minBurn}-{preview.maxBurn} px
      <span className="text-arena-muted">| {Math.round(preview.critChance * 100)}% crit</span>
      {preview.momentumBonus >= 2 && (
        <span className="text-orange-400">| x{preview.momentumBonus} momentum</span>
      )}
      {preview.synergyActive && (
        <span className="text-arena-glow">| synergy active</span>
      )}
    </motion.div>
  )
}

// ─── Step action bar ──────────────────────────────────────────────────────────
// Slim strip pinned below the arena grid. Selection happens on the fighter
// cards above — this bar only shows status, preview, modifiers, and the
// "Let Them Fight" escape hatch. No attacker/target lists here.

function StepActionBar({
  attackerId, defenderId, isPowerMove, setIsPowerMove,
  alivePlayers, aliveOpponents, powerMoveAvailable, config,
  onLetThemFight,
}: {
  attackerId: number | null
  defenderId: number | null
  isPowerMove: boolean
  setIsPowerMove: (v: boolean) => void
  alivePlayers: BattleFighter[]
  aliveOpponents: BattleFighter[]
  powerMoveAvailable: boolean
  config: DifficultyConfig
  onLetThemFight: () => void
}) {
  const attacker = alivePlayers.find((f) => f.id === attackerId) ?? null
  const defender = aliveOpponents.find((f) => f.id === defenderId) ?? null
  const preview = attacker && defender
    ? computeDamagePreview(attacker, defender, config, alivePlayers, isPowerMove)
    : null

  const statusText = !attackerId
    ? 'Select attacker'
    : !defenderId
      ? 'Select target'
      : 'Ready - click target to fire'

  const statusColor = !attackerId
    ? 'text-arena-glow'
    : !defenderId
      ? 'text-yellow-400'
      : 'text-arena-glow'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid gap-3 rounded-xl border border-arena-glow/25 bg-[#050f05] px-4 py-3 shadow-[0_0_18px_#22c55e1f] lg:grid-cols-[1fr_auto]"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <motion.p
          key={statusText}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          className={`font-pixel text-[9px] uppercase tracking-widest ${statusColor}`}
        >
          {statusText}
        </motion.p>

        <AnimatePresence>
          {preview && <DamagePreviewChip preview={preview} />}
        </AnimatePresence>

        {powerMoveAvailable && attackerId && (
          <button
            type="button"
            onClick={() => setIsPowerMove(!isPowerMove)}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 font-pixel text-[9px] uppercase tracking-widest transition-colors ${
              isPowerMove
                ? 'border-yellow-400/60 bg-yellow-400/10 text-yellow-400'
                : 'border-arena-border text-arena-muted hover:border-yellow-400/40 hover:text-yellow-400'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            {isPowerMove ? 'Power Move ON' : 'Power Move'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-arena-muted">
        <span className="font-pixel text-[8px] uppercase tracking-widest text-white">Shortcuts</span>
        <ArcadeKey>1</ArcadeKey>
        <ArcadeKey>2</ArcadeKey>
        <ArcadeKey>3</ArcadeKey>
        <span>fighter</span>
        <ArcadeKey>Right</ArcadeKey>
        <span>target</span>
        <ArcadeKey>Space</ArcadeKey>
        <span>attack</span>
        <ArcadeKey>?</ArcadeKey>
        <span>guide</span>

        <Button
          variant="outline"
          size="sm"
          className="ml-1 border-arena-border/60 text-arena-muted hover:border-arena-glow/40 hover:text-arena-text"
          onClick={onLetThemFight}
        >
          <Play className="h-3.5 w-3.5" />
          Let Them Fight
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Clickable fighter wrapper for step mode ──────────────────────────────────
// Wraps FighterCard with step-mode selection visuals without modifying FighterCard.

function SelectableFighterCard({
  fighter, scale, impactLevel, showParticles, animateDamage,
  selectionState, onClick,
}: {
  fighter: BattleFighter
  scale: number
  impactLevel: number
  showParticles: boolean
  animateDamage: boolean
  // 'attacker' | 'target' | 'eligible' | 'idle'
  selectionState: 'attacker' | 'target' | 'eligible' | 'idle'
  onClick: () => void
}) {
  const ringColor =
    selectionState === 'attacker' ? '#22c55e' :
    selectionState === 'target'   ? '#ef4444' :
    selectionState === 'eligible' ? '#22c55e44' : 'transparent'

  const pulseRing =
    selectionState === 'attacker' || selectionState === 'eligible'

  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      {/* Selection ring — outside the card so it doesn't shift layout */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-lg"
        animate={pulseRing
          ? { boxShadow: [`0 0 0 2px ${ringColor}`, `0 0 0 4px ${ringColor}88`, `0 0 0 2px ${ringColor}`] }
          : { boxShadow: `0 0 0 2px ${ringColor}` }
        }
        transition={{ repeat: pulseRing ? Infinity : 0, duration: 1.2 }}
      />
      
      <FighterCard
        fighter={fighter}
        scale={scale}
        impactLevel={impactLevel}
        showParticles={showParticles}
        animateDamage={animateDamage}
      />

      <AnimatePresence>
        {selectionState === 'attacker' && (
      <motion.p
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="mt-2 text-center font-pixel text-[8px] uppercase tracking-widest text-arena-glow"
        >
          Attacker
      </motion.p>
        )}

      {selectionState === 'target' && (
      <motion.p
        initial={{ opacity: 0, y: -3 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="mt-2 text-center font-pixel text-[8px] uppercase tracking-widest text-arena-danger"
      >
        Target
      </motion.p>
        )}
    </AnimatePresence>
    </div>
  )
}

// ─── Victory animation ────────────────────────────────────────────────────────

function VictoryBurst() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div key={i} className="absolute h-2 w-2 rounded-full"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${20 + Math.random() * 60}%`,
            backgroundColor: i % 3 === 0 ? '#00ff9f' : i % 3 === 1 ? '#fbbf24' : '#f87171',
          }}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ y: -200 - Math.random() * 200, opacity: 0, scale: 0 }}
          transition={{ duration: 1.2 + Math.random() * 0.8, ease: 'easeOut', delay: Math.random() * 0.3 }}
        />
      ))}
    </div>
  )
}

// ─── Pixel diff card ──────────────────────────────────────────────────────────

function PixelDiffCard({ fighter }: { fighter: BattleFighter }) {
  const { evolution } = useBattleStore()

  const burnCount = evolution?.burnedIndices[fighter.id]?.length ?? (() => {
    let n = 0
    for (let i = 0; i < fighter.originalPixels.length; i++) {
      if (fighter.originalPixels[i] === '1' && fighter.pixels[i] === '0') n++
    }
    return n
  })()

  const survivalPct = Math.round((evolution?.pixelSurvivalRate[fighter.id] ?? 0) * 100)
  const legacy = evolution?.legacyScore[fighter.id] ?? fighter.hp

  const lore = burnCount === 0
    ? `#${fighter.id} emerged untouched.`
    : burnCount < 50
    ? `#${fighter.id}'s canvas bears faint scars of legacy.`
    : burnCount < 150
    ? `#${fighter.id} carries ${burnCount} burned pixels — proof of battle.`
    : `#${fighter.id} was ravaged. ${burnCount} pixels consumed by the Arena.`

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-12 flex-col items-center justify-end text-center">
        <p className="font-pixel text-[9px] text-arena-text">#{fighter.id}</p>
        {fighter.agentPersona && (
          <p className="font-mono text-[9px] text-arena-glow">{fighter.agentPersona.name}</p>
        )}
        {fighter.eliminated && (
          <p className="font-pixel text-[8px] uppercase tracking-widest text-arena-danger">Eliminated</p>
        )}
      </div>

      <div className="flex items-end gap-3">
        {/* BEFORE */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-mono text-[8px] uppercase tracking-widest text-arena-muted">Before</p>
          <div className="rounded border border-arena-border/40">
            <NormieRenderer
              normieId={fighter.id}
              pixelOverride={fighter.originalPixels}
              scale={3}
              showBorder={false}
              interactive={false}
              minimal
            />
          </div>
        </div>

        {/* Arrow + px count — self-center so it floats mid-canvas */}
        <div className="self-center flex flex-col items-center gap-1 pb-1">
          <svg width="20" height="10" viewBox="0 0 20 10" fill="none" className="text-arena-border">
            <path d="M0 5h16M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="font-mono text-[7px] text-arena-border">{burnCount}px</p>
        </div>

        {/* AFTER */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-mono text-[8px] uppercase tracking-widest text-arena-glow">After</p>
          <div
            className="rounded border"
            style={{
              borderColor: fighter.eliminated ? '#ef4444' : '#22c55e44',
              boxShadow: fighter.eliminated ? '0 0 6px #ef444422' : '0 0 6px #22c55e22',
            }}
          >
            <NormieRenderer
              normieId={fighter.id}
              pixelOverride={fighter.pixels}
              scale={3}
              showBorder={false}
              interactive={false}
              minimal
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 font-mono text-[9px] text-arena-muted">
        <span>Survived <span className="text-arena-text">{survivalPct}%</span></span>
        <span>Legacy <span className="font-bold text-arena-glow">{legacy}</span></span>
      </div>

      <p className="max-w-[160px] text-center font-mono text-[10px] text-[#22c55e]">
        {lore}
      </p>
    </div>
  )
}

// ─── Results screen ───────────────────────────────────────────────────────────

function FighterRow({
  fighters,
  label,
  startDelay,
}: {
  fighters: BattleFighter[]
  label: string
  startDelay: number
}) {
  return (
    <div className="w-full space-y-4">
      <p className="text-center font-pixel text-sm font-bold uppercase tracking-widest text-white">
        {label}
      </p>
      <div className="flex flex-wrap justify-center gap-10">
        {fighters.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: startDelay + i * 0.1 }}
          >
            <PixelDiffCard fighter={f} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ResultsScreen({ winningSide, playerFighters, opponentFighters, onReplay, onFightAgain }: {
  winningSide: 'player' | 'opponent' | 'draw'
  playerFighters: BattleFighter[]
  opponentFighters: BattleFighter[]
  onReplay: () => void
  onFightAgain: () => void
}) {
  const title = winningSide === 'player' ? 'Victory' : winningSide === 'opponent' ? 'Defeated' : 'Draw'
  const titleColor = winningSide === 'player' ? 'text-arena-glow' : winningSide === 'opponent' ? 'text-arena-danger' : 'text-arena-muted'

  return (
    <>
      {winningSide === 'player' && <VictoryBurst />}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-10 py-10 px-2 w-full"
      >
        <motion.h1
          className={`w-full text-center font-pixel text-2xl uppercase tracking-widest ${titleColor}`}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={winningSide === 'player' ? { textShadow: '0 0 20px #22c55e, 0 0 40px #22c55e44' } : undefined}
        >
          {title}
        </motion.h1>

        <FighterRow
          fighters={playerFighters}
          label="Your Squad"
          startDelay={0.15}
        />

        <div className="flex w-full items-center gap-4">
          <div className="flex-1 border-t border-arena-border/30" />
          <span className="font-pixel text-[9px] uppercase tracking-[4px] text-arena-border">vs</span>
          <div className="flex-1 border-t border-arena-border/30" />
        </div>

        <FighterRow
          fighters={opponentFighters}
          label="Opponents"
          startDelay={0.35}
        />

        <div className="flex w-full flex-wrap justify-center gap-3 pt-2">
          <Button variant="glow" onClick={onReplay}>
            <RotateCcw className="h-4 w-4" />Replay
          </Button>
          <Button variant="outline" onClick={onFightAgain}>
            <Zap className="h-4 w-4" />Fight Again
          </Button>
          <Button asChild variant="ghost">
            <Link to="/normies"><ArrowLeft className="h-4 w-4" />Browse</Link>
          </Button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function BattleArenaPage() {
  const { selectedIds } = useNormieSelection()
  const { play: playSound } = useBattleAudio()

  const {
    difficulty, setDifficulty,
    battleMode, setBattleMode,
    phase, setPhase,
    playerFighters, setPlayerFighters,
    opponentFighters, setOpponentFighters,
    livePlayers, liveOpponents, setLiveFighters,
    snapshots, setSnapshots,
    currentRound, stepForward, stepBackward, setCurrentRound,
    isAutoPlaying, setAutoPlaying,
    visibleLogs, allLogs, appendLogs, clearLogs,
    currentStepRound, incrementStepRound,
    powerMoveAvailable, consumePowerMove,
    stepRng, initStepRng,
    winningSide, setResult, battleSeed,
    resetBattle,
  } = useBattleStore()

  const [loadError, setLoadError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [fastForward, setFastForward] = useState(false)
  const [flashIntensity, setFlashIntensity] = useState(0)
  const [particleFighterId, setParticleFighterId] = useState<number | null>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Broadcast mode ─────────────────────────────────────────────────────────
  const [broadcastMode, setBroadcastMode] = useState(true)
  const [broadcastEvent, setBroadcastEvent] = useState<BroadcastEvent | null>(null)
  const broadcastPauseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Step mode selection state — lifted to page level ──────────────────────
  const [stepAttackerId, setStepAttackerId] = useState<number | null>(null)
  const [stepDefenderId, setStepDefenderId] = useState<number | null>(null)
  const [stepIsPowerMove, setStepIsPowerMove] = useState(false)

  const [legacySaveStatus, setLegacySaveStatus] = useState<
  'idle' | 'saving' | 'saved' | 'error'
>('idle')

const [legacySaveSummary, setLegacySaveSummary] = useState<{
  score: number
  scars: number
} | null>(null)


const legacySaveKeyRef = useRef<string | null>(null)
const suppressReplayLegacySaveRef = useRef(false)
const selectedIdsKey = useMemo(
  () => selectedIds.slice().sort((a, b) => a - b).join('-'),
  [selectedIds],
)

const loadedPlayerFightersKey = useMemo(
  () => playerFighters.map((fighter) => fighter.id).sort((a, b) => a - b).join('-'),
  [playerFighters],
)
  // Reset selection when a new turn starts
  useEffect(() => {
    if (phase === 'awaiting_input') {
      setStepAttackerId(livePlayers.filter((f) => !f.eliminated)[0]?.id ?? null)
      setStepDefenderId(null)
      setStepIsPowerMove(false)
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-clear eliminated fighters from selection
  const alivePlayers = livePlayers.filter((f) => !f.eliminated)
  const aliveOpponents = liveOpponents.filter((f) => !f.eliminated)
  useEffect(() => {
    if (stepAttackerId != null && !alivePlayers.find((f) => f.id === stepAttackerId))
      setStepAttackerId(alivePlayers[0]?.id ?? null)
  }, [alivePlayers, stepAttackerId])
  useEffect(() => {
    if (stepDefenderId != null && !aliveOpponents.find((f) => f.id === stepDefenderId))
      setStepDefenderId(null)
  }, [aliveOpponents, stepDefenderId])

  useEffect(() => {
  if (selectedIds.length === 0) return
  if (isFirstBattleVisit()) setShowHelp(true)
  }, [selectedIds.length])

  const triggerFlash = useCallback((intensity: number) => {
    if (intensity < 0.4) return
    setFlashIntensity(intensity)
    setTimeout(() => setFlashIntensity(0), 180)
  }, [])

  const broadcastResume = useCallback(() => {
    if (broadcastPauseRef.current) clearTimeout(broadcastPauseRef.current)
    setBroadcastEvent(null)
    setAutoPlaying(true)
  }, [setAutoPlaying])

  const broadcastPowerMove = useCallback(() => {
    if (broadcastPauseRef.current) clearTimeout(broadcastPauseRef.current)
    setBroadcastEvent(null)
    consumePowerMove()
    playSound('powerMove')
    const { currentRound: cur, snapshots: snaps } = useBattleStore.getState()
    const snap = snaps[cur]
    if (snap) appendLogs(snap.logs)
    stepForward()
    setAutoPlaying(true)
  }, [consumePowerMove, playSound, appendLogs, stepForward, setAutoPlaying])

  const broadcastSkip = useCallback(() => {
    if (broadcastPauseRef.current) clearTimeout(broadcastPauseRef.current)
    if (autoRef.current) clearInterval(autoRef.current)
    setBroadcastEvent(null)
    setAutoPlaying(false)
    setPhase('results')
  }, [setAutoPlaying, setPhase])

  const loadFighters = useCallback(async () => {
    if (selectedIds.length === 0) return
    setPhase('loading')
    setLoadError(null)
    clearLogs()
    try {
      const config = DIFFICULTY_CONFIGS[difficulty]
      const playerData = await Promise.all(selectedIds.map(loadFighterData))
      const players = playerData.map(({ pixels, profile }) =>
        buildFighter(profile, pixels, 'player', config))
      setPlayerFighters(players)

      const storedOpponent = sessionStorage.getItem('arena_custom_opponent')
      const opponentIds: number[] = storedOpponent != null
        ? [Number(storedOpponent)]
        : pickOpponentIds(selectedIds, Math.max(1, selectedIds.length))
      if (storedOpponent != null) sessionStorage.removeItem('arena_custom_opponent')

      appendLogs([{ id: 'sys-load', type: 'system', round: 0,
        text: `Summoning ${opponentIds.length} opponent(s)…`, timestamp: Date.now() }])

      const opponentData = await Promise.all(opponentIds.map(loadFighterData))
      const opponents = opponentData.map(({ pixels, profile }) =>
        buildFighter(profile, pixels, 'opponent', config))
      setOpponentFighters(opponents)

      const synergies = detectSynergies(players)
      if (synergies.length > 0) {
        appendLogs(synergies.map((s, i) => ({
          id: `syn-${i}`, type: 'synergy' as const, round: 0,
          text: `✦ ${s.name}: ${s.description}`, timestamp: Date.now(),
        })))
      }

      appendLogs([{ id: 'sys-ready', type: 'system', round: 0,
        text: 'Fighters loaded. Assign tactics before battle.', timestamp: Date.now() }])

      setPhase('tactics')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load fighters')
      setPhase('setup')
    }
  }, [selectedIds, difficulty, setPhase, clearLogs, appendLogs, setPlayerFighters, setOpponentFighters])

  const confirmTactics = useCallback((stances: Record<number, Stance>) => {
    const updatedPlayers = playerFighters.map((f) => ({ ...f, stance: stances[f.id] ?? f.stance }))
    setPlayerFighters(updatedPlayers)
    setPhase('ready')
  }, [playerFighters, setPlayerFighters, setPhase])

  const startAutoBattle = useCallback(() => {
    if (!playerFighters.length || !opponentFighters.length) return
    clearLogs()
    playSound('roundStart')
    const result = runBattleSimulation(playerFighters, opponentFighters, difficulty)
    setSnapshots(result.snapshots)
    setResult(result.evolution, result.winningSide, result.seed)
    setCurrentRound(0)
    setPhase('fighting')
    const firstSnap = result.snapshots[0]
    if (firstSnap) appendLogs(firstSnap.logs)
    setCurrentRound(1)
    setAutoPlaying(true)
  }, [playerFighters, opponentFighters, difficulty, clearLogs, playSound, setSnapshots, setResult, setCurrentRound, setPhase, appendLogs, setAutoPlaying])

  const startStepBattle = useCallback(() => {
    if (!playerFighters.length || !opponentFighters.length) return
    clearLogs()
    setLiveFighters(playerFighters.map((f) => ({ ...f })), opponentFighters.map((f) => ({ ...f })))
    const seed = buildBattleSeed(playerFighters.map((f) => f.id), opponentFighters.map((f) => f.id), Date.now())
    initStepRng(seed)
    setPhase('awaiting_input')
    playSound('roundStart')
  }, [playerFighters, opponentFighters, clearLogs, setLiveFighters, initStepRng, setPhase, playSound])

  // ── confirmStepAction — unchanged logic, now called with page-level state ──
  const confirmStepAction = useCallback((action: TurnAction) => {
    if (!stepRng) return
    const config = DIFFICULTY_CONFIGS[difficulty]
    const players = livePlayers.map((f) => ({ ...f, traits: [...f.traits], lastDamagedIndices: [...f.lastDamagedIndices] }))
    const opponents = liveOpponents.map((f) => ({ ...f, traits: [...f.traits], lastDamagedIndices: [...f.lastDamagedIndices] }))

    const { snapshot, battleOver } = executeOneTurn(players, opponents, action, currentStepRound, config, stepRng)

    if (action.isPowerMove) { consumePowerMove(); playSound('powerMove') }

    const maxImpact = Math.max(0, ...snapshot.logs.map((l) => l.impactLevel ?? 0))
    if (maxImpact > 0.7) { playSound('crit'); triggerFlash(maxImpact) }
    else if (maxImpact > 0) playSound('hit')
    if (snapshot.logs.some((l) => l.type === 'elimination')) playSound('eliminate')
    if (maxImpact > 0.5) setParticleFighterId(action.defenderId)
    setTimeout(() => setParticleFighterId(null), 600)

    appendLogs(snapshot.logs)
    setLiveFighters(players, opponents)
    setSnapshots([...snapshots, snapshot])
    incrementStepRound()

    if (battleOver || currentStepRound >= config.rounds) {
      const pPx = players.filter((f) => !f.eliminated).reduce((s, f) => s + f.pixels.split('').filter((c: string) => c === '1').length, 0)
      const oPx = opponents.filter((f) => !f.eliminated).reduce((s, f) => s + f.pixels.split('').filter((c: string) => c === '1').length, 0)
      const ws = pPx > oPx ? 'player' : oPx > pPx ? 'opponent' : 'draw'
      if (ws === 'player') playSound('victory')
      setResult({
        fighterIds: [...players, ...opponents].map((f) => f.id), winnerId: null,
        pixelSurvivalRate: Object.fromEntries([...players, ...opponents].map((f) => {
          const orig = [...playerFighters, ...opponentFighters].find((o) => o.id === f.id)
          const origOn = orig?.originalPixels.split('').filter((c: string) => c === '1').length ?? 1
          return [f.id, f.pixels.split('').filter((c: string) => c === '1').length / origOn]
        })),
        burnedIndices: {},
        legacyScore: Object.fromEntries([...players, ...opponents].map((f) => [f.id, f.hp])),
      }, ws, 'step-mode')
      setPhase('results')
    } else {
      setPhase('awaiting_input')
      playSound('roundStart')
    }
  }, [stepRng, difficulty, livePlayers, liveOpponents, currentStepRound, consumePowerMove, playSound, triggerFlash, appendLogs, setLiveFighters, setSnapshots, snapshots, incrementStepRound, playerFighters, opponentFighters, setResult, setPhase])

  // ── Step mode: fire action when both attacker + defender are set ──────────
  const fireStepAction = useCallback(() => {
    if (!stepAttackerId || !stepDefenderId) return
    confirmStepAction({
      attackerId: stepAttackerId,
      defenderId: stepDefenderId,
      isPowerMove: stepIsPowerMove,
      focusFire: false,
    })
    setStepIsPowerMove(false)
  }, [stepAttackerId, stepDefenderId, stepIsPowerMove, confirmStepAction])

  // ── Step mode: "Let Them Fight" — hand off to broadcast auto ──────────────
  const letThemFight = useCallback(() => {
    if (!livePlayers.length || !liveOpponents.length) return
    clearLogs()
    playSound('roundStart')
    const result = runBattleSimulation(
      livePlayers.map((f) => ({ ...f })),
      liveOpponents.map((f) => ({ ...f })),
      difficulty,
    )
    setSnapshots(result.snapshots)
    setResult(result.evolution, result.winningSide, result.seed)
    setCurrentRound(0)
    setBattleMode('auto')
    setPhase('fighting')
    const firstSnap = result.snapshots[0]
    if (firstSnap) appendLogs(firstSnap.logs)
    setCurrentRound(1)
    setAutoPlaying(true)
  }, [livePlayers, liveOpponents, difficulty, clearLogs, playSound, setSnapshots, setResult, setCurrentRound, setBattleMode, setPhase, appendLogs, setAutoPlaying])

  // ── Page-level keyboard handler for step mode ─────────────────────────────
  useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    if (e.key === '?' || e.key.toLowerCase() === 'h') {
      e.preventDefault()
      setShowHelp(true)
      return
    }

    if (showHelp || phase !== 'awaiting_input') return

    if (e.key === '1' && alivePlayers[0]) setStepAttackerId(alivePlayers[0].id)
    if (e.key === '2' && alivePlayers[1]) setStepAttackerId(alivePlayers[1].id)
    if (e.key === '3' && alivePlayers[2]) setStepAttackerId(alivePlayers[2].id)

    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const idx = aliveOpponents.findIndex((f) => f.id === stepDefenderId)
      const next = e.key === 'ArrowRight'
        ? (idx + 1) % aliveOpponents.length
        : (idx - 1 + aliveOpponents.length) % aliveOpponents.length
      setStepDefenderId(aliveOpponents[next]?.id ?? null)
    }

    if (e.key === ' ') {
      e.preventDefault()
      if (!stepDefenderId && aliveOpponents.length > 0) {
        const target = aliveOpponents.reduce((b, f) => f.hp < b.hp ? f : b, aliveOpponents[0])
        setStepDefenderId(target.id)
        setTimeout(() => {
          if (stepAttackerId) {
            confirmStepAction({
              attackerId: stepAttackerId,
              defenderId: target.id,
              isPowerMove: stepIsPowerMove,
              focusFire: false,
            })
            setStepIsPowerMove(false)
          }
        }, 0)
      } else {
        fireStepAction()
      }
    }

    if (e.key === 's' || e.key === 'S') {
      if (aliveOpponents.length === 0 || !stepAttackerId) return
      const target = aliveOpponents.reduce((b, f) => f.hp < b.hp ? f : b, aliveOpponents[0])
      setStepDefenderId(target.id)
      setTimeout(() => {
        confirmStepAction({
          attackerId: stepAttackerId,
          defenderId: target.id,
          isPowerMove: stepIsPowerMove,
          focusFire: false,
        })
        setStepIsPowerMove(false)
      }, 0)
    }
  }

  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [phase, showHelp, alivePlayers, aliveOpponents, stepAttackerId, stepDefenderId, stepIsPowerMove, fireStepAction, confirmStepAction])

  // ── Auto-play loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAutoPlaying || phase !== 'fighting') return
    const interval = fastForward ? FAST_FORWARD_MS : AUTO_INTERVAL_MS[difficulty]

    autoRef.current = setInterval(() => {
      const { currentRound: cur, snapshots: snaps } = useBattleStore.getState()

      if (cur >= snaps.length) {
        setAutoPlaying(false)
        setPhase('results')
        const { winningSide: ws } = useBattleStore.getState()
        if (ws === 'player') playSound('victory')
        if (autoRef.current) clearInterval(autoRef.current)
        return
      }

      const snap = snaps[cur]
      if (snap) {
        const maxImpact = Math.max(0, ...snap.logs.map((l) => l.impactLevel ?? 0))
        const hasCrit = maxImpact > 0.7
        const hasElim = snap.logs.some((l) => l.type === 'elimination')
        const hasPowerMove = snap.logs.some((l) => l.type === 'powermove')

        if (hasCrit) { playSound('crit'); triggerFlash(maxImpact) }
        else if (maxImpact > 0) playSound('hit')
        if (hasElim) playSound('eliminate')

        if (broadcastMode && !fastForward && (hasCrit || hasElim || hasPowerMove)) {
          if (autoRef.current) clearInterval(autoRef.current)
          setAutoPlaying(false)
          useBattleStore.getState().stepForward()

          const dramatic = snap.logs.find((l) =>
            l.type === 'elimination' || l.type === 'powermove' ||
            (l.impactLevel != null && l.impactLevel > 0.7),
          )
          const eventType: BroadcastEvent['type'] = hasElim ? 'elimination'
            : hasPowerMove ? 'powermove' : 'crit'

          setBroadcastEvent({
            text: dramatic?.text ?? `Round ${cur + 1} — critical hit`,
            type: eventType,
          })

          broadcastPauseRef.current = setTimeout(() => {
            setBroadcastEvent(null)
            setAutoPlaying(true)
          }, BROADCAST_PAUSE_MS)
          return
        }
      }

      useBattleStore.getState().stepForward()
    }, interval)

    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [isAutoPlaying, phase, difficulty, fastForward, broadcastMode, setAutoPlaying, setPhase, playSound, triggerFlash])

  useEffect(() => {
    if (phase !== 'fighting' || !currentRound || currentRound < snapshots.length || isAutoPlaying) return
    setPhase('results')
  }, [currentRound, snapshots.length, phase, isAutoPlaying, setPhase])

  const currentSnap = snapshots[currentRound - 1]
  const displayPlayers = phase === 'fighting' || phase === 'results'
    ? (currentSnap?.playerFighters ?? playerFighters) : playerFighters
  const displayOpponents = phase === 'fighting' || phase === 'results'
    ? (currentSnap?.opponentFighters ?? opponentFighters) : opponentFighters

  const impactMap: Record<number, number> = {}
  if (currentSnap) {
    for (const log of currentSnap.logs) {
      if (log.defenderId != null && log.impactLevel) {
        impactMap[log.defenderId] = Math.max(impactMap[log.defenderId] ?? 0, log.impactLevel)
      }
    }
  }

  useEffect(() => {
    if (phase !== 'results') return
    if (!selectedIdsKey) return
    if (selectedIdsKey === loadedPlayerFightersKey) return

  setLegacySaveStatus('idle')
  setLegacySaveSummary(null)
  legacySaveKeyRef.current = null
  suppressReplayLegacySaveRef.current = false

  resetBattle()
  loadFighters()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selectedIdsKey, loadedPlayerFightersKey])

  useEffect(() => {
    if (phase !== 'results' || winningSide == null) return

  const finalSnap = snapshots[snapshots.length - 1]

  const finalPlayers =
    battleMode === 'step'
      ? livePlayers
      : finalSnap?.playerFighters ?? playerFighters

  const finalOpponents =
    battleMode === 'step'
      ? liveOpponents
      : finalSnap?.opponentFighters ?? opponentFighters

  if (!playerFighters.length || !opponentFighters.length) return
  if (!finalPlayers.length || !finalOpponents.length) return

  const saveKey = [
    battleSeed ?? 'step',
    battleMode,
    difficulty,
    winningSide,
    playerFighters.map((fighter) => fighter.id).join('-'),
    opponentFighters.map((fighter) => fighter.id).join('-'),
  ].join(':')

  const storedSaveKey = `evolution_arena_legacy_saved:${saveKey}`
  const storedSummary = window.localStorage.getItem(storedSaveKey)

  if (storedSummary) {
    try {
      const parsed = JSON.parse(storedSummary) as { score: number; scars: number }

      legacySaveKeyRef.current = saveKey
      setLegacySaveStatus('saved')
      setLegacySaveSummary(parsed)
      return
    } catch {
      window.localStorage.removeItem(storedSaveKey)
    }
  }

  if (suppressReplayLegacySaveRef.current) {
  suppressReplayLegacySaveRef.current = false
  legacySaveKeyRef.current = saveKey
  setLegacySaveStatus('saved')
  return
}

  if (legacySaveKeyRef.current === saveKey) {
    return
  }

  legacySaveKeyRef.current = saveKey
  setLegacySaveStatus('saving')
  setLegacySaveSummary(null)

  submitBattleResult({
    battleMode,
    difficulty,
    winningSide,
    playerFighters,
    opponentFighters,
    finalPlayerFighters: finalPlayers,
    finalOpponentFighters: finalOpponents,
    clientSubmissionKey: saveKey,
  })
    .then((result) => {
      const summary = {
        score: result.totalLegacyDelta,
        scars: result.totalScars,
      }

      window.localStorage.setItem(storedSaveKey, JSON.stringify(summary))

      setLegacySaveStatus('saved')
      setLegacySaveSummary(summary)
    })
    .catch((error) => {
      console.error('Failed to save legacy result', error)

      legacySaveKeyRef.current = null
      setLegacySaveStatus('error')
    })
    
}, [
  phase,
  winningSide,
  battleSeed,
  battleMode,
  difficulty,
  playerFighters,
  opponentFighters,
  livePlayers,
  liveOpponents,
  snapshots,
])

  // ── Gate ──
  if (selectedIds.length === 0 && phase === 'setup') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <Swords className="h-10 w-10 text-arena-border" />
        <div className="space-y-2">
          <p className="font-pixel text-sm text-arena-text">Arena empty</p>
          <p className="max-w-xs text-sm text-arena-muted">Browse Normies and add up to 3 to your squad.</p>
        </div>
        <Button asChild variant="glow"><Link to="/normies">Browse Normies</Link></Button>
      </motion.div>
    )
  }

  // ── Results ──
  if (phase === 'results' && winningSide != null) {
  const fp = battleMode === 'step' ? livePlayers : displayPlayers
  const fo = battleMode === 'step' ? liveOpponents : displayOpponents

  return (
    <div className="min-w-0 space-y-6">
      <div className="rounded-lg border border-arena-glow/25 bg-black/35 px-4 py-3 text-center">
        {legacySaveStatus === 'saving' && (
          <p className="font-pixel text-[10px] uppercase tracking-widest text-arena-muted">
            Saving legacy...
          </p>
        )}

        {legacySaveStatus === 'saved' && (
          <p className="font-pixel text-[10px] uppercase tracking-widest text-arena-glow">
            Legacy saved
            {legacySaveSummary
              ? ` · +${legacySaveSummary.score} score · ${legacySaveSummary.scars} scars recorded`
              : ''}
          </p>
        )}

        {legacySaveStatus === 'error' && (
          <p className="font-pixel text-[10px] uppercase tracking-widest text-red-300">
            Legacy save failed · battle result still completed
          </p>
        )}

        {legacySaveStatus === 'idle' && (
          <p className="font-pixel text-[10px] uppercase tracking-widest text-arena-muted">
            Preparing legacy record...
          </p>
        )}
      </div>

      <ResultsScreen
        winningSide={winningSide}
        playerFighters={fp}
        opponentFighters={fo}
        onReplay={() => {
          suppressReplayLegacySaveRef.current = true

          if (battleSeed && battleMode === 'auto') {
            clearLogs()
            const result = runBattleSimulation(playerFighters, opponentFighters, difficulty, battleSeed)
            setSnapshots(result.snapshots)
            setResult(result.evolution, result.winningSide, result.seed)
          }

          setPhase('fighting')
          clearLogs()
          setCurrentRound(0)

          const firstSnap = snapshots[0]
          if (firstSnap) appendLogs(firstSnap.logs)

          setCurrentRound(1)
          setAutoPlaying(true)
        }}
        onFightAgain={() => {
          setLegacySaveStatus('idle')
          setLegacySaveSummary(null)
          legacySaveKeyRef.current = null
          resetBattle()
          loadFighters()
        }}
      />
    </div>
  )
}

  // ── Tactics ──
  if (phase === 'tactics') {
    return (
      <div className="min-w-0 space-y-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/normies"><ArrowLeft className="h-4 w-4" />Back</Link></Button>
          <h1 className="font-pixel text-sm text-arena-text">Battle Arena</h1>
        </div>
        <TacticsScreen fighters={playerFighters} onConfirm={confirmTactics} />
      </div>
    )
  }

  // ── Determine rendering source for fighter columns ────────────────────────
  const isStepMode = battleMode === 'step' && phase === 'awaiting_input'
  const renderPlayers = isStepMode ? livePlayers : displayPlayers
  const renderOpponents = isStepMode ? liveOpponents : displayOpponents

  // ── Main arena ──
  return (
    <>
      <HowToPlayModal open={showHelp} onClose={() => setShowHelp(false)} />

      <AnimatePresence>
        {flashIntensity > 0 && (
          <motion.div key="flash"
            className="pointer-events-none fixed inset-0 z-30 bg-white"
            initial={{ opacity: flashIntensity * 0.35 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>

      <div className="min-w-0 space-y-5">
        {/* Top bar */}
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link to="/normies"><ArrowLeft className="h-4 w-4" />Back</Link>
            </Button>
            <h1 className="font-pixel text-sm text-arena-text">Battle Arena</h1>
          </div>
          <DifficultySelector value={difficulty}
            onChange={(d) => { setDifficulty(d); if (phase === 'ready') resetBattle() }}
            disabled={['fighting', 'loading', 'awaiting_input'].includes(phase)}
          />
          <div className="flex items-center gap-2 lg:justify-end">
            <span className="font-pixel text-[9px] uppercase tracking-widest text-arena-muted">
              {phase === 'loading' && <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>Loading…</motion.span>}
              {phase === 'ready' && 'Ready'}
              
              {phase === 'fighting' && `Round ${currentRound} / ${snapshots.length}`}
              {phase === 'awaiting_input' && `Round ${currentStepRound} / ${DIFFICULTY_CONFIGS[difficulty].rounds}`}
              {phase === 'setup' && `${selectedIds.length} selected`}
            </span>
            <button type="button" onClick={() => setShowHelp(true)}
              className="rounded p-1 text-arena-muted transition-colors hover:text-arena-glow" aria-label="How to play">
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {loadError && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded border border-arena-danger/40 px-3 py-2 text-sm text-arena-danger">
              {loadError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Broadcast callout */}
        <AnimatePresence>
          {broadcastEvent && (
            <BroadcastCallout event={broadcastEvent}
              onResume={broadcastResume} onPowerMove={broadcastPowerMove}
              onSkip={broadcastSkip} powerMoveAvailable={powerMoveAvailable}
            />
          )}
        </AnimatePresence>

        {/* Arena grid */}
        <div className="grid min-w-0 gap-5 lg:grid-cols-[1fr_220px_1fr] lg:gap-6">

          {/* Your squad */}
          <section className="space-y-3">
            <h2 className="font-pixel text-[9px] uppercase tracking-widest text-arena-muted">Your Squad</h2>
            <div className="flex min-w-0 flex-wrap justify-center gap-3 sm:gap-4 lg:justify-start">
              {phase === 'loading'
                ? selectedIds.map((id) => <FighterSkeleton key={id} />)
                : renderPlayers.map((f: BattleFighter) => {
                    const selState = isStepMode
                      ? f.id === stepAttackerId ? 'attacker'
                      : !stepAttackerId && !f.eliminated ? 'eligible'
                      : 'idle'
                      : 'idle'

                    return isStepMode ? (
                      <SelectableFighterCard
                        key={f.id}
                        fighter={f}
                        scale={4}
                        impactLevel={impactMap[f.id] ?? 0}
                        showParticles={particleFighterId === f.id}
                        animateDamage={f.lastDamagedIndices.length > 0}
                        selectionState={selState as 'attacker' | 'target' | 'eligible' | 'idle'}
                        onClick={() => {
                          if (!f.eliminated) setStepAttackerId(f.id)
                        }}
                      />
                    ) : (
                      <FighterCard key={f.id} fighter={f} scale={5}
                        impactLevel={impactMap[f.id] ?? 0}
                        showParticles={particleFighterId === f.id}
                        animateDamage={
                          (phase === 'fighting' && (currentSnap?.pixelChanges[f.id]?.length ?? 0) > 0)
                        }
                      />
                    )
                  })
              }
            </div>
          </section>

          {/* CRT log center */}
          <section className="flex flex-col items-center gap-3 min-w-0">
            <div className="relative w-full overflow-hidden rounded-lg border-[6px] border-[#2f2f2f] bg-[#050805] shadow-[0_0_0_3px_#111,0_0_0_5px_#1a1a1a,0_0_34px_#22c55e33,inset_0_0_28px_#22c55e12]">
              <div className="pointer-events-none absolute inset-0 z-10"
                style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)' }}
              />
              <div className="relative z-20 border-b border-[#1e1e1e] px-4 pt-3 pb-2 text-center">
                {(phase === 'fighting' || phase === 'awaiting_input') ? (
                  <motion.p
                    key={phase === 'fighting' ? currentRound : currentStepRound}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono text-2xl font-bold tracking-[3px] text-[#22c55e]"
                    style={{ textShadow: '0 0 14px #22c55e, 0 0 28px #22c55e66' }}
                  >
                    ROUND {phase === 'fighting' ? currentRound : currentStepRound}
                    <span className="text-[#22c55e66] text-base"> / {phase === 'fighting' ? snapshots.length : DIFFICULTY_CONFIGS[difficulty].rounds}</span>
                  </motion.p>
                ) : (
                  <motion.p className="font-mono text-base font-bold tracking-[2px]"
                    animate={phase === 'ready' ? { color: ['#22c55e', '#00ff9f', '#22c55e'] } : { color: '#555' }}
                    transition={{ repeat: Infinity, duration: 2 }}>
                    {phase === 'loading' ? 'LOADING' : phase === 'ready' ? 'READY' : 'VS'}
                  </motion.p>
                )}
              </div>
              <div className="relative z-20 h-64 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-[#22c55e44] scrollbar-track-transparent">
                <BattleLog entries={visibleLogs} allEntries={allLogs} className="w-full" />
              </div>
              <div className="pointer-events-none absolute inset-0 z-10 rounded-xl"
                style={{ boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)' }}
              />
            </div>
          </section>

          {/* Opponents */}
          <section className="space-y-3">
            <h2 className="font-pixel text-[9px] uppercase tracking-widest text-arena-muted lg:text-right">Opponents</h2>
            <div className="flex flex-wrap justify-start gap-4 lg:justify-end">
              {phase === 'loading'
                ? [0, 1].map((i) => <FighterSkeleton key={i} />)
                : renderOpponents.map((f: BattleFighter) => {
                    const selState = isStepMode
                      ? f.id === stepDefenderId ? 'target'
                      : stepAttackerId && !f.eliminated ? 'eligible'
                      : 'idle'
                      : 'idle'

                    return isStepMode ? (
                      <SelectableFighterCard
                        key={f.id}
                        fighter={f}
                        scale={4}
                        impactLevel={impactMap[f.id] ?? 0}
                        showParticles={particleFighterId === f.id}
                        animateDamage={f.lastDamagedIndices.length > 0}
                        selectionState={selState as 'attacker' | 'target' | 'eligible' | 'idle'}
                        onClick={() => {
                          if (f.eliminated || !stepAttackerId) return
                          if (stepDefenderId === f.id) {
                            fireStepAction()
                          } else {
                            setStepDefenderId(f.id)
                          }
                        }}
                      />
                    ) : (
                      <FighterCard key={f.id} fighter={f} scale={5}
                        impactLevel={impactMap[f.id] ?? 0}
                        showParticles={particleFighterId === f.id}
                        animateDamage={
                          (phase === 'fighting' && (currentSnap?.pixelChanges[f.id]?.length ?? 0) > 0)
                        }
                      />
                    )
                  })
              }
            </div>
          </section>
        </div>

        {/* Step mode action bar — pinned below arena grid, no scroll needed */}
        {phase === 'awaiting_input' && alivePlayers.length > 0 && aliveOpponents.length > 0 && (
          <StepActionBar
            attackerId={stepAttackerId}
            defenderId={stepDefenderId}
            isPowerMove={stepIsPowerMove}
            setIsPowerMove={setStepIsPowerMove}
            alivePlayers={alivePlayers}
            aliveOpponents={aliveOpponents}
            powerMoveAvailable={powerMoveAvailable}
            config={DIFFICULTY_CONFIGS[difficulty]}
            onLetThemFight={letThemFight}
          />
        )}

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 border-t border-arena-border pt-4">
          {phase === 'setup' && (
            <Button variant="glow" onClick={loadFighters} disabled={selectedIds.length === 0}>
              <Zap className="h-4 w-4" />Load Fighters
            </Button>
          )}

          {phase === 'ready' && (
            <>
              <div className="flex gap-1 rounded-lg border border-arena-border p-1">
                {(['auto', 'step'] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setBattleMode(m)}
                    className={`rounded px-3 py-1.5 font-pixel text-[9px] uppercase tracking-widest transition-colors
                      ${battleMode === m ? 'bg-arena-glow/15 text-arena-glow' : 'text-arena-muted hover:text-arena-text'}`}>
                    {m === 'auto' ? 'Auto' : 'Step'}
                  </button>
                ))}
              </div>
              {battleMode === 'auto' && (
                <button type="button" onClick={() => setBroadcastMode((v) => !v)}
                  className={`flex items-center gap-1.5 rounded border px-3 py-1.5 font-pixel text-[9px] uppercase tracking-widest transition-colors
                    ${broadcastMode
                      ? 'border-arena-glow/60 bg-arena-glow/10 text-arena-glow'
                      : 'border-arena-border text-arena-muted hover:border-arena-glow/30 hover:text-arena-text'}`}
                >
                  <Radio className="h-3.5 w-3.5" />
                  {broadcastMode ? 'Broadcast ON' : 'Broadcast'}
                </button>
              )}
              <Button variant="glow" onClick={battleMode === 'auto' ? startAutoBattle : startStepBattle}>
                <Swords className="h-4 w-4" />Start Battle
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { resetBattle(); loadFighters() }}>
                <RotateCcw className="h-3.5 w-3.5" />Re-roll opponents
              </Button>
            </>
          )}

          {phase === 'fighting' && (
            <>
              <Button variant="outline" size="sm" onClick={stepBackward} disabled={currentRound <= 1 || isAutoPlaying}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline"
                onClick={() => {
                  if (isAutoPlaying) { setAutoPlaying(false); if (autoRef.current) clearInterval(autoRef.current) }
                  else setAutoPlaying(true)
                }}>
                {isAutoPlaying ? <><Pause className="h-4 w-4" />Pause</> : <><Play className="h-4 w-4" />Auto</>}
              </Button>
              <Button variant={fastForward ? 'glow' : 'outline'} size="sm"
                onClick={() => setFastForward((v) => !v)} title="Fast Forward">
                <FastForward className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => { setAutoPlaying(false); stepForward() }}
                disabled={currentRound >= snapshots.length || isAutoPlaying}>
                Step<ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm"
                onClick={() => { setAutoPlaying(false); if (autoRef.current) clearInterval(autoRef.current); setPhase('results') }}>
                Skip to results
              </Button>
            </>
          )}

          {phase === 'loading' && (
            <motion.p className="font-pixel text-[9px] uppercase tracking-widest text-arena-glow"
              animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
              Fetching fighters from chain…
            </motion.p>
          )}
        </div>
      </div>
    </>
  )
}