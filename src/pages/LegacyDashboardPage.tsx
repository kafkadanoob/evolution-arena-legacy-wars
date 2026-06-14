import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, RefreshCw, X, Flame, Shield, Skull, Swords } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { NormieRenderer } from '@/components/normie/NormieRenderer'
import {
  fetchLegacyLeaderboard,
  fetchNormieBattleHistory,
  fetchLegacyMatchCount,
  type LegacyLeaderboardRow,
  type NormieBattleResult,
} from '@/api/legacy'

function formatScore(value: number) {
  return new Intl.NumberFormat().format(Math.round(value))
}

function winRate(row: LegacyLeaderboardRow) {
  if (row.battles === 0) return 0
  return Math.round((row.wins / row.battles) * 100)
}

function LegacyStat({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded border border-arena-border bg-black/35 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-widest text-arena-muted">
        {label}
      </p>
      <p className="mt-1 font-pixel text-sm text-arena-text">{value}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-arena-border bg-black/35 px-6 py-10 text-center">
      <Trophy className="mx-auto h-10 w-10 text-arena-border" />
      <p className="mt-4 font-pixel text-sm text-arena-text">No legacy records yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-arena-muted">
        Finish a battle to write the first arena result. Once saved, Normies will rank here by
        survival, destruction, scars, and wins.
      </p>

      <Button asChild variant="glow" className="mt-5">
        <Link to="/battle">
          <Swords className="h-4 w-4" />
          Start Battle
        </Link>
      </Button>
    </div>
  )
}

function NormieDetailModal({
  row,
  onClose,
}: {
  row: LegacyLeaderboardRow
  onClose: () => void
}) {
  const [history, setHistory] = useState<NormieBattleResult[]>([])
  const [viewMode, setViewMode] = useState<'original' | 'scars'>('original')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    setLoading(true)
    setError(null)

    fetchNormieBattleHistory(row.normie_id, 24)
      .then((records) => {
        if (!active) return
        setHistory(records)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load battle history')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [row.normie_id])

  const scarIndices = useMemo(() => {
    const unique = new Set<number>()

    for (const battle of history) {
      for (const index of battle.damaged_pixels) {
        unique.add(index)
      }
    }

    return Array.from(unique)
  }, [history])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 pt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative max-h-[84vh] w-full max-w-4xl overflow-y-auto rounded-lg border-2 border-arena-glow bg-[#080808] shadow-[0_0_34px_#22c55e30]"
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />

        <div className="relative z-10 flex items-center justify-between border-b border-arena-glow/25 px-4 py-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-arena-muted">
              Legacy Record
            </p>
            <h2 className="mt-1 font-pixel text-xs text-arena-text">
              Normie #{row.normie_id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-arena-glow transition-colors hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-10 grid gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <div className="rounded-lg border border-arena-border bg-black/35 p-3">
              <div className="mb-3 grid grid-cols-2 overflow-hidden rounded border border-arena-border">
                <button
                  type="button"
                  onClick={() => setViewMode('original')}
                  className={`px-2 py-2 font-pixel text-[8px] uppercase tracking-widest ${
                    viewMode === 'original'
                      ? 'bg-arena-glow text-black'
                      : 'text-arena-muted hover:text-arena-glow'
                  }`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('scars')}
                  className={`px-2 py-2 font-pixel text-[8px] uppercase tracking-widest ${
                    viewMode === 'scars'
                      ? 'bg-red-300 text-black'
                      : 'text-arena-muted hover:text-red-300'
                  }`}
                >
                  Scar View
                </button>
              </div>

              <div className="flex h-[220px] items-center justify-center overflow-hidden rounded border border-arena-border bg-[#101010] p-2 sm:h-[240px]">
                <NormieRenderer
                  normieId={row.normie_id}
                  scale={5}
                  minimal
                  interactive={false}
                  showBorder={false}
                  showScars={viewMode === 'scars'}
                  scarIndices={scarIndices}
                  scarColor="rgba(248, 113, 113, 0.95)"
                />
              </div>

              <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-widest text-arena-muted">
                {viewMode === 'scars'
                  ? `${formatScore(scarIndices.length)} scar pixels`
                  : 'Source Normie render'}
              </p>
            </div>

            <div className="rounded-lg border border-arena-glow/30 bg-arena-glow/10 px-3 py-3">
              <p className="font-mono text-[9px] uppercase tracking-widest text-arena-muted">
                Legacy Score
              </p>
              <p className="mt-2 font-pixel text-2xl text-arena-glow">
                {formatScore(row.legacy_score)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <LegacyStat label="Record" value={`${row.wins}W-${row.losses}L`} />
              <LegacyStat label="Win Rate" value={`${winRate(row)}%`} />
              <LegacyStat label="Destroyed" value={formatScore(row.pixels_destroyed)} />
              <LegacyStat label="Lost" value={formatScore(row.pixels_lost)} />
              <LegacyStat label="Battles" value={formatScore(row.battles)} />
              <LegacyStat label="Scars" value={formatScore(row.scar_count)} />
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <p className="font-pixel text-[10px] uppercase tracking-widest text-arena-glow">
              Recent Battles
            </p>

            {loading && (
              <p className="font-mono text-xs text-arena-muted">Loading battle history...</p>
            )}

            {error && (
              <p className="rounded border border-red-400/30 bg-red-400/10 px-3 py-2 font-mono text-xs text-red-300">
                {error}
              </p>
            )}

            {!loading && !error && history.length === 0 && (
              <p className="rounded border border-arena-border bg-black/35 px-3 py-4 text-center font-mono text-xs text-arena-muted">
                No individual battle records found yet.
              </p>
            )}

            <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-arena-glow/30">
              {history.map((battle) => (
                <div
                  key={battle.id}
                  className="rounded border border-arena-border bg-black/35 px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`font-pixel text-[9px] uppercase tracking-widest ${
                        battle.won ? 'text-arena-glow' : 'text-red-300'
                      }`}
                    >
                      {battle.won ? 'Win' : 'Loss'}
                    </span>
                    <span className="font-mono text-[10px] text-arena-muted">
                      {new Date(battle.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <Flame className="mx-auto h-3.5 w-3.5 text-arena-glow" />
                      <p className="mt-1 font-mono text-[10px] text-arena-muted">
                        {battle.pixels_destroyed} dealt
                      </p>
                    </div>
                    <div>
                      <Skull className="mx-auto h-3.5 w-3.5 text-red-300" />
                      <p className="mt-1 font-mono text-[10px] text-arena-muted">
                        {battle.pixels_lost} lost
                      </p>
                    </div>
                    <div>
                      <Shield className="mx-auto h-3.5 w-3.5 text-arena-glow" />
                      <p className="mt-1 font-mono text-[10px] text-arena-muted">
                        +{formatScore(battle.legacy_delta)}
                      </p>
                    </div>
                    <div>
                      <Skull className="mx-auto h-3.5 w-3.5 text-red-300" />
                      <p className="mt-1 font-mono text-[10px] text-arena-muted">
                        {battle.damaged_pixels.length} scars
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function LegacyDashboardPage() {
  const [rows, setRows] = useState<LegacyLeaderboardRow[]>([])
  const [selectedRow, setSelectedRow] = useState<LegacyLeaderboardRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchCount, setMatchCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadLeaderboard = async () => {
    setLoading(true)
    setError(null)

    try {
      const [data, totalMatches] = await Promise.all([
        fetchLegacyLeaderboard(50),
        fetchLegacyMatchCount(),
      ])

        setRows(data)
        setMatchCount(totalMatches)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
  }, [])

  return (
    <>
      <AnimatePresence>
        {selectedRow && (
          <NormieDetailModal row={selectedRow} onClose={() => setSelectedRow(null)} />
        )}
      </AnimatePresence>

      <div className="space-y-8">
        <motion.div
          className="flex flex-wrap items-start justify-between gap-4"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="space-y-3">
            <p className="font-pixel text-[10px] uppercase tracking-[0.2em] text-arena-glow">
              Arena Memory
            </p>
            <h1 className="font-pixel text-xl text-arena-text">Legacy Leaderboard</h1>
            <p className="max-w-2xl text-sm leading-6 text-arena-muted">
              Every saved battle feeds this board. Normies rise through survival,
              destruction, scars, and victories.
            </p>
          </div>

          <Button variant="outline" onClick={loadLeaderboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LegacyStat label="Tracked Normies" value={rows.length} />
          <LegacyStat label="Total Matches" value={formatScore(matchCount)} />
          <LegacyStat
            label="Fighter Records"
            value={formatScore(rows.reduce((sum, row) => sum + row.battles, 0))}
        />
          <LegacyStat
            label="Total Scars"
            value={formatScore(rows.reduce((sum, row) => sum + row.scar_count, 0))}
        />
       </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-arena-muted">
          Total Matches = saved fights. Fighter Records = per-Normie results.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-arena-muted">
          Total matches are saved fights. Fighter records are per-Normie battle results.
        </p>

        {error && (
          <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-3 font-mono text-sm text-red-300">
            {error}
          </p>
        )}

        {loading && (
          <div className="rounded-lg border border-arena-border bg-black/35 px-6 py-10 text-center">
            <Swords className="mx-auto h-9 w-9 animate-pulse text-arena-glow" />
            <p className="mt-4 font-mono text-sm text-arena-muted">
              Loading legacy records...
            </p>
          </div>
        )}

        {!loading && !error && rows.length === 0 && <EmptyState />}

        {!loading && !error && rows.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-arena-border bg-black/35">
            <div className="grid grid-cols-[64px_1fr_120px_120px_120px] gap-3 border-b border-arena-border px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-arena-muted">
              <span>Rank</span>
              <span>Normie</span>
              <span>Score</span>
              <span>Record</span>
              <span>Scars</span>
            </div>

            <div className="divide-y divide-arena-border/70">
              {rows.map((row, index) => (
                <button
                  key={row.normie_id}
                  type="button"
                  onClick={() => setSelectedRow(row)}
                  className="grid w-full grid-cols-[64px_1fr_120px_120px_120px] gap-3 px-4 py-4 text-left transition-colors hover:bg-arena-glow/[0.04]"
                >
                  <span className="font-pixel text-xs text-arena-glow">
                    #{index + 1}
                  </span>
                  <span>
                    <span className="font-pixel text-xs text-arena-text">
                      Normie #{row.normie_id}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] text-arena-muted">
                      {row.battles} battles - {winRate(row)}% win rate
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold text-arena-text">
                    {formatScore(row.legacy_score)}
                  </span>
                  <span className="font-mono text-sm text-arena-muted">
                    {row.wins}W-{row.losses}L
                  </span>
                  <span className="font-mono text-sm text-arena-muted">
                    {formatScore(row.scar_count)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}