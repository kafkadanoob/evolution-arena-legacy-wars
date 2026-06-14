import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Shuffle, Calendar, Trophy, ArrowRight, X, Flame, Sparkles, Medal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNormieSelection } from '@/hooks/useNormieSelection'
import { useBattleStore } from '@/stores/useBattleStore'

const CUSTOM_OPPONENT_KEY = 'arena_custom_opponent'
const DAILY_BEST_KEY = 'arena_daily_best'

function getDailyOpponentId(): number {
  const seed = new Date().toISOString().slice(0, 10)
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash % 10000
}

function getTimeUntilMidnightUTC(): string {
  const now = new Date()
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ))
  const diffMs = midnight.getTime() - now.getTime()
  const h = Math.floor(diffMs / 3_600_000)
  const m = Math.floor((diffMs % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

function getDailyBestScore(): number | null {
  try {
    const raw = localStorage.getItem(DAILY_BEST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const today = new Date().toISOString().slice(0, 10)
    if (parsed.date !== today) return null
    return parsed.score as number
  } catch {
    return null
  }
}

interface HubCardProps {
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  to?: string
  onClick?: () => void
  disabled?: boolean
  featured?: boolean
  delay?: number
}

function HubCard({
  icon,
  title,
  description,
  badge,
  to,
  onClick,
  disabled,
  featured,
  delay = 0,
}: HubCardProps) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`group relative flex min-h-[190px] flex-col justify-between overflow-hidden rounded-lg border p-5 transition-colors ${
        disabled
          ? 'cursor-not-allowed border-arena-border/40 bg-black/35 opacity-70'
          : featured
            ? 'cursor-pointer border-arena-glow/60 bg-arena-glow/10 shadow-[0_0_28px_#22c55e1f] hover:border-arena-glow'
            : 'cursor-pointer border-arena-border bg-black/35 hover:border-arena-glow/50 hover:bg-arena-glow/[0.04]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.04)_3px,rgba(255,255,255,0.04)_4px)]" />

      {badge && (
        <span
          className={`absolute right-3 top-3 rounded px-2 py-1 font-pixel text-[8px] uppercase tracking-widest ${
            disabled
              ? 'bg-arena-border/20 text-arena-muted'
              : 'bg-arena-glow/15 text-arena-glow'
          }`}
        >
          {badge}
        </span>
      )}

      <div className="relative z-10 space-y-4">
        <div className="text-arena-glow">{icon}</div>
        <div>
          <p className="font-pixel text-xs text-arena-text">{title}</p>
          <p className="mt-2 text-sm leading-6 text-arena-muted">{description}</p>
        </div>
      </div>

      {!disabled && (
        <ArrowRight className="relative z-10 h-4 w-4 self-end text-arena-border transition-colors group-hover:text-arena-glow" />
      )}
    </motion.div>
  )

  if (disabled) return inner
  if (onClick) {
    return (
      <button type="button" className="w-full text-left" onClick={onClick}>
        {inner}
      </button>
    )
  }
  if (to) return <Link to={to}>{inner}</Link>
  return inner
}

function CustomDuelModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { selectedIds } = useNormieSelection()
  const resetBattle = useBattleStore((state) => state.resetBattle)
  const [inputVal, setInputVal] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleChallenge = () => {
    const parsed = Number(inputVal)

    if (inputVal.trim() === '' || Number.isNaN(parsed)) {
      setError('Enter a valid Normie ID')
      return
    }
    if (parsed < 0 || parsed > 9999) {
      setError('ID must be between 0 and 9999')
      return
    }
    if (selectedIds.length === 0) {
      setError('Select at least one fighter in the Normies browser first')
      return
    }

    sessionStorage.setItem(CUSTOM_OPPONENT_KEY, String(Math.floor(parsed)))
      resetBattle()
      onClose()
      navigate('/battle')
  }

  const handleInputChange = (value: string) => {
    setInputVal(value.replace(/\D/g, '').slice(0, 4))
    setError(null)
  }

  return (
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
        className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#22c55e] bg-[#080808] shadow-[0_0_44px_#22c55e38]"
      >
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.18) 2px,rgba(0,0,0,0.18) 4px)',
          }}
        />

        <div className="relative z-20 flex items-center justify-between border-b border-[#22c55e33] px-5 py-4">
          <p
            className="font-mono text-sm font-bold uppercase tracking-[2px] text-[#22c55e]"
            style={{ textShadow: '0 0 10px #22c55e' }}
          >
            Custom Duel
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[#22c55e] transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-20 space-y-5 px-5 py-5">
          <p className="font-mono text-xs leading-6 text-white">
            Pick any Normie ID and force a direct duel. Your current squad enters as the challengers.
          </p>

          <div className="space-y-2">
            <label htmlFor="duel-id" className="font-mono text-[10px] uppercase tracking-widest text-[#22c55e]">
              Opponent ID (0-9999)
            </label>
            <input
              id="duel-id"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={inputVal}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChallenge()
              }}
              placeholder="e.g. 4221"
              className="w-full rounded border border-[#22c55e33] bg-[#0f0f0f] px-3 py-3 font-mono text-sm text-white placeholder-[#444] focus:border-[#22c55e] focus:outline-none"
            />
            {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
          </div>

          {selectedIds.length === 0 && (
            <p className="rounded border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 font-mono text-[10px] leading-5 text-yellow-300">
              No squad selected. Visit the Normies browser to add fighters first.
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="glow"
              className="flex-1"
              disabled={selectedIds.length === 0}
              onClick={handleChallenge}
            >
              <Swords className="h-4 w-4" />
              Challenge
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function DailyChallengeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { selectedIds } = useNormieSelection()
  const opponentId = getDailyOpponentId()
  const timeLeft = getTimeUntilMidnightUTC()
  const bestScore = getDailyBestScore()

  const handleAccept = () => {
    if (selectedIds.length === 0) return
    sessionStorage.setItem(CUSTOM_OPPONENT_KEY, String(opponentId))
    onClose()
    navigate('/battle')
  }

  return (
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
        className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#22c55e] bg-[#080808] shadow-[0_0_44px_#22c55e38]"
      >
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.18) 2px,rgba(0,0,0,0.18) 4px)',
          }}
        />

        <div className="relative z-20 flex items-center justify-between border-b border-[#22c55e33] px-5 py-4">
          <p
            className="font-mono text-sm font-bold uppercase tracking-[2px] text-[#22c55e]"
            style={{ textShadow: '0 0 10px #22c55e' }}
          >
            Daily Challenge
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[#22c55e] transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-20 space-y-5 px-5 py-5">
          <div className="rounded-lg border border-[#22c55e33] bg-[#0f1f0f] px-4 py-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#22c55e]">
              Today's Opponent
            </p>
            <p className="mt-2 font-pixel text-2xl text-white">#{opponentId}</p>
            <p className="mt-2 font-mono text-[10px] text-[#777]">
              Refreshes in {timeLeft}
            </p>
          </div>

          {bestScore != null ? (
            <div className="rounded border border-[#22c55e22] px-3 py-2 text-center">
              <p className="font-mono text-[10px] text-[#777]">Your best today</p>
              <p className="font-mono text-sm font-bold text-[#22c55e]">
                {bestScore} legacy pts
              </p>
            </div>
          ) : (
            <p className="text-center font-mono text-[10px] text-[#777]">
              No score set yet today. Be first.
            </p>
          )}

          <p className="font-mono text-xs leading-6 text-white">
            Face the same opponent as every player today. Your legacy score is saved locally.
          </p>

          {selectedIds.length === 0 && (
            <p className="rounded border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 font-mono text-[10px] leading-5 text-yellow-300">
              No squad selected. Visit the Normies browser to add fighters first.
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="glow"
              className="flex-1"
              disabled={selectedIds.length === 0}
              onClick={handleAccept}
            >
              <Swords className="h-4 w-4" />
              Accept Challenge
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function ArenaHubPage() {
  const navigate = useNavigate()
  const { selectedIds } = useNormieSelection()
  const resetBattle = useBattleStore((state) => state.resetBattle)
  const hasFighters = selectedIds.length > 0

  const handleEnterBattle = () => {
    resetBattle()
    navigate('/battle')
  }

  const [showCustomDuel, setShowCustomDuel] = useState(false)
  const [showDailyChallenge, setShowDailyChallenge] = useState(false)

  return (
    <>
      <AnimatePresence>
        {showCustomDuel && <CustomDuelModal onClose={() => setShowCustomDuel(false)} />}
        {showDailyChallenge && <DailyChallengeModal onClose={() => setShowDailyChallenge(false)} />}
      </AnimatePresence>

      <div className="space-y-8">
        <motion.div
          className="grid gap-6 lg:grid-cols-[1fr_auto]"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="space-y-3">
            <p className="font-pixel text-[10px] uppercase tracking-[0.2em] text-arena-glow">
              Evolution Arena
            </p>
            <h1 className="font-pixel text-xl text-arena-text">Arena Hub</h1>
            <p className="max-w-2xl text-sm leading-6 text-arena-muted">
              Choose a battle route. Every match burns pixels, changes survival history,
              and pushes Normies toward a long-term legacy score.
            </p>
          </div>

          <div className="hidden rounded-lg border border-arena-glow/25 bg-black/35 px-5 py-4 lg:block">
            <p className="font-mono text-[10px] uppercase tracking-widest text-arena-muted">
              Current Squad
            </p>
            <p className="mt-1 font-pixel text-2xl text-arena-text">
              {selectedIds.length}/3
            </p>
            <p className="mt-1 font-mono text-[10px] text-arena-glow">
              {hasFighters ? 'Ready to deploy' : 'No fighters selected'}
            </p>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2">
          {[
            { icon: <Flame className="h-3.5 w-3.5" />, label: 'Permanent Scars' },
            { icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Pixel Regrowth' },
            { icon: <Medal className="h-3.5 w-3.5" />, label: 'Legacy Score' },
          ].map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-2 rounded border border-arena-border bg-black/35 px-3 py-2 font-pixel text-[8px] uppercase tracking-widest text-arena-muted"
            >
              <span className="text-arena-glow">{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap items-center gap-4 rounded-lg border border-arena-glow/35 bg-arena-glow/[0.06] px-5 py-4 shadow-[0_0_30px_#22c55e12]"
        >
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-xs text-arena-glow">
              {hasFighters
                ? `${selectedIds.length} fighter${selectedIds.length > 1 ? 's' : ''} selected`
                : 'No fighters selected'}
            </p>
            <p className="mt-1 text-sm leading-6 text-white">
              {hasFighters
                ? 'Your squad is loaded. Pick a mode and enter the arena.'
                : 'Browse Normies and add up to 3 fighters, then return here.'}
            </p>
          </div>

          {hasFighters ? (
            <Button type="button" variant="glow" size="lg" onClick={handleEnterBattle}>
              <Swords className="h-4 w-4" />
                Enter Battle Arena
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/normies">
                <Swords className="h-4 w-4" />
                Browse Normies
              </Link>
            </Button>
          )}
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <HubCard
            icon={<Shuffle className="h-5 w-5" />}
            title="Quick Match"
            description="Load your squad, draw random opponents from the chain, and battle immediately."
            badge="Live"
            onClick={handleEnterBattle}
            delay={0.15}
          />
          <HubCard
            icon={<Swords className="h-5 w-5" />}
            title="Custom Duel"
            description="Choose a specific opponent ID and challenge any Normie directly."
            badge="Live"
            onClick={() => setShowCustomDuel(true)}
            delay={0.2}
          />
          <HubCard
            icon={<Calendar className="h-5 w-5" />}
            title="Daily Challenge"
            description="Face the same seeded opponent as every player for 24 hours."
            badge="Live"
            featured
            onClick={() => setShowDailyChallenge(true)}
            delay={0.25}
          />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
        <Link
          to="/legacy"
          className="group relative block overflow-hidden rounded-lg border border-arena-border bg-black/35 p-5 transition-colors hover:border-arena-glow/60 hover:bg-arena-glow/[0.04]"
        >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.12),transparent_34%)]" />

        <div className="relative z-10 grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded border border-arena-glow/35 bg-arena-glow/10 text-arena-glow">
        <Trophy className="h-7 w-7" />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-pixel text-sm text-arena-text transition-colors group-hover:text-arena-glow">
              Legacy Leaderboard
            </h2>
            <span className="rounded bg-arena-glow/15 px-2 py-1 font-pixel text-[8px] uppercase tracking-widest text-arena-glow">
              Live
            </span>
          </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-arena-muted">
          The long-term arena layer: winners evolve, losers carry burn scars,
          and every result feeds a score based on survival, destruction, and awakened bonuses.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center lg:min-w-[260px]">
        {[
          ['Survive', 'HP left'],
          ['Destroy', 'Pixels burned'],
          ['Awaken', 'Bonus'],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-arena-border bg-black/35 px-3 py-2">
            <p className="font-pixel text-[8px] uppercase tracking-widest text-arena-glow">
              {label}
            </p>
            <p className="mt-1 font-mono text-[10px] text-arena-muted">
              {value}
            </p>
          </div>
              ))}
          </div>
        </div>
      </Link>
      </motion.section>

      
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="max-w-3xl text-xs leading-6 text-arena-border"
        >
          Every battle writes to the canvas. Winners evolve through regrowth.
          Losers leave a permanent mark on their pixel history. Legacy is measured
          in what survived, what burned, and what the arena remembers.
        </motion.p>
      </div>
    </>
  )
}