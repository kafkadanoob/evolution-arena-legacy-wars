/**
 * NormieDetailPanel.tsx
 *
 * Visual upgrade — arcade fighter profile feel.
 * Logic, hooks, data fetching, routing: UNCHANGED.
 *
 * What changed (visual only):
 *
 * ART FRAME:
 *   - Dark #0a0a0a bg retained; added animated green glow pulse via boxShadow
 *   - Corner bracket accents (4 divs, same pattern as TacticsScreen header)
 *   - Border upgraded from border-arena-border → border-[#22c55e33]
 *
 * HEADER:
 *   - "Normie #X" bumped to font-pixel text-3xl with white glow textShadow
 *   - metadata.name stays as muted subtitle
 *   - agentName now rendered as a green badge pill instead of plain text
 *   - wallet address stays font-mono text-xs arena-muted (unchanged, just kept)
 *
 * STAT CARDS:
 *   - Value text changed from text-xl font-bold → font-pixel text-2xl
 *   - Border upgraded from border-[#2a2a2a] → border-[#22c55e22] with green tint
 *   - Subtle green top-edge accent line added per card
 *
 * ARENA LEGACY:
 *   - Score and Record values bumped to font-pixel text-xl
 *   - Section border upgraded to border-[#22c55e44] with bg-[#050f05]
 *   - "Arena Legacy" label gets same glow textShadow as tactics screen
 *   - Battles and Scars values also bumped to font-pixel text-xl
 *
 * Everything else (Back button, badges, traits, history, action buttons,
 * all logic/hooks/data): UNCHANGED.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Swords, User } from 'lucide-react'
import { NormieTraitList } from '@/components/normie/NormieTraitList'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNormieProfile } from '@/hooks/useNormieProfile'
import { useNormieSelection } from '@/hooks/useNormieSelection'
import { profileMatchesFilters } from '@/lib/browser-filters'
import { fetchNormieLegacyStats, type LegacyLeaderboardRow } from '@/api/legacy'
import { toggleFavoriteNormieId, getFavoriteNormieIds } from '@/lib/normie-storage'
import type { BrowserFilters } from '@/types/browser'

interface NormieDetailPanelProps {
  normieId: number
  filters: BrowserFilters
  onFavoriteChange?: () => void
  onBack?: () => void
}

export function NormieDetailPanel({
  normieId,
  filters,
  onFavoriteChange,
  onBack,
}: NormieDetailPanelProps) {
  const profile = useNormieProfile(normieId)
  const { isSelected, toggleSelection, selectedIds, canSelectMore } = useNormieSelection()
  const [favorited, setFavorited] = useState(() => getFavoriteNormieIds().includes(normieId))
  const [legacyStats, setLegacyStats] = useState<LegacyLeaderboardRow | null>(null)

  useEffect(() => {
    let active = true

    fetchNormieLegacyStats(normieId)
      .then((stats) => {
        if (active) setLegacyStats(stats)
      })
      .catch(() => {
        if (active) setLegacyStats(null)
      })

    return () => {
      active = false
    }
  }, [normieId])

  const matchesFilters = profileMatchesFilters(profile, filters)
  const selected = isSelected(normieId)

  return (
    <motion.div
      key={normieId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="normie-detail-panel space-y-6 rounded-xl border border-arena-border bg-arena-bg/80 p-4 md:p-6"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">

        {/* ── Left column: art ─────────────────────────────────── */}
        <div className="flex w-full shrink-0 flex-col items-center gap-3 lg:w-[320px]">

          {/* Art frame with glow pulse + corner accents */}
          <motion.div
            className="relative aspect-square w-full overflow-hidden rounded-xl border border-[#22c55e33] bg-[#0a0a0a]"
            animate={{
              boxShadow: [
                '0 0 10px #22c55e11, inset 0 0 20px #00000066',
                '0 0 24px #22c55e33, inset 0 0 20px #00000066',
                '0 0 10px #22c55e11, inset 0 0 20px #00000066',
              ],
            }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            {/* Corner bracket accents */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-5 w-5 border-l-2 border-t-2 border-[#22c55e88]" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-5 w-5 border-r-2 border-t-2 border-[#22c55e88]" />
            <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-5 w-5 border-b-2 border-l-2 border-[#22c55e88]" />
            <div className="pointer-events-none absolute bottom-0 right-0 z-10 h-5 w-5 border-b-2 border-r-2 border-[#22c55e88]" />

            <img
              src={
                profile.isAwakened
                  ? `https://api.normies.art/agents/image/${normieId}`
                  : `https://api.normies.art/normie/${normieId}/image.svg`
              }
              alt={`Normie #${normieId}`}
              className="h-full w-full"
              style={{
                imageRendering: 'pixelated',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </motion.div>

          {/* Awakened badge — unchanged */}
          {profile.isAwakened && (
            <div className="flex items-center gap-1.5 rounded border border-black/20 bg-[#22c55e] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[2px] text-black shadow-[0_0_12px_#22c55e80]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Awakened
            </div>
          )}

          {/* Other badges — unchanged */}
          <div className="flex flex-wrap justify-center gap-2">
            {profile.canvasInfo?.customized && <Badge variant="glow">Customized</Badge>}
            {profile.isBurned && <Badge variant="danger">Burned</Badge>}
            {!matchesFilters && profile.state === 'success' && (
              <Badge variant="muted">Hidden by filters</Badge>
            )}
          </div>
        </div>

        {/* ── Right column: info ───────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-4 lg:pt-1">

          {/* Header */}
          <div>
            {/* Back button — unchanged */}
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.delete('id')
                window.history.pushState({}, '', url.toString())
                window.dispatchEvent(new PopStateEvent('popstate'))
                onBack?.()
              }}
              className="mb-3 flex items-center gap-1.5 rounded border border-arena-border px-3 py-1.5 font-pixel text-[9px] uppercase tracking-widest text-arena-muted transition-colors hover:border-arena-glow hover:text-arena-glow"
            >
              ← Back to Browser
            </button>

            {/* Fighter ID — large */}
            <h2
              className="font-pixel text-3xl text-white"
              style={{ textShadow: '0 0 16px rgba(255,255,255,0.25), 0 0 32px #22c55e22' }}
            >
              Normie #{normieId}
            </h2>

            {/* metadata name — muted subtitle, unchanged */}
            {profile.metadata?.name && (
              <p className="mt-1 text-arena-muted">{profile.metadata.name}</p>
            )}

            {/* Agent name — now a green badge pill */}
            {profile.agentName && (
              <span
                className="mt-2 inline-block rounded-md border border-[#22c55e44] bg-[#0a1f0a] px-3 py-1 font-mono text-xs font-bold uppercase tracking-[2px] text-[#22c55e]"
                style={{ textShadow: '0 0 8px #22c55e66' }}
              >
                {profile.agentName}
              </span>
            )}
          </div>

          {/* Loading / error states — unchanged */}
          {profile.state === 'loading' && (
            <p className="text-sm text-arena-muted">Loading on-chain data…</p>
          )}
          {profile.state === 'error' && (
            <p className="text-sm text-arena-danger">{profile.error}</p>
          )}

          {profile.state === 'success' && (
            <>
              {/* Stat cards — pixel font values, green-tinted borders */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    label: 'ACTION PTS',
                    value: String(profile.canvasInfo?.actionPoints ?? 0),
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 h-5 w-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'LEVEL',
                    value: String(profile.canvasInfo?.level ?? 1),
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 h-5 w-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'VERSIONS',
                    value: String(profile.historyVersions.length),
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 h-5 w-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ),
                  },
                  {
                    label: 'PIXELS',
                    value: profile.pixelCount != null ? String(profile.pixelCount) : '-',
                    icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-2 h-5 w-5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                    ),
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="relative overflow-hidden rounded-lg border-2 border-[#22c55e22] bg-[#0a0f0a] p-3 text-center font-mono"
                  >
                    {/* Scanlines */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)',
                      }}
                    />
                    {/* Green top-edge accent */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#22c55e44]" />
                    {stat.icon}
                    <p className="text-[9px] uppercase tracking-[1.5px] text-[#22c55e]">
                      {stat.label}
                    </p>
                    {/* Value: pixel font, larger */}
                    <p
                      className="relative mt-1 font-pixel text-2xl text-white"
                      style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Canvas diff — unchanged */}
              {profile.canvasDiff && (
                <p className="font-mono text-xs text-arena-muted">
                  Canvas diff: +{profile.canvasDiff.addedCount} / -{profile.canvasDiff.removedCount} (net{' '}
                  {profile.canvasDiff.netChange > 0 ? '+' : ''}
                  {profile.canvasDiff.netChange})
                </p>
              )}

              {/* Wallet address — unchanged */}
              {profile.owner && (
                <p className="flex items-start gap-2 break-all font-mono text-xs text-arena-muted">
                  <User className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {profile.owner.owner}
                </p>
              )}

              {/* Arena Legacy — upgraded visual weight */}
              <div className="relative overflow-hidden rounded-lg border border-[#22c55e44] bg-[#050f05] p-4">
                {/* Scanlines */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
                  }}
                />
                {/* Top accent */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#22c55e33]" />

                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <h3
                      className="font-pixel text-[10px] uppercase tracking-widest text-arena-glow"
                      style={{ textShadow: '0 0 8px #22c55e66' }}
                    >
                      Arena Legacy
                    </h3>
                    <p className="mt-1 font-mono text-xs text-arena-muted">
                      Saved battle-history layer
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/legacy">View Legacy</Link>
                  </Button>
                </div>

                {legacyStats ? (
                  <div className="relative mt-4 grid grid-cols-2 gap-2">
                    {[
                      { label: 'Score', value: Math.round(Number(legacyStats.legacy_score)).toLocaleString() },
                      { label: 'Record', value: `${legacyStats.wins}W-${legacyStats.losses}L` },
                      { label: 'Battles', value: String(legacyStats.battles) },
                      { label: 'Scars', value: legacyStats.scar_count.toLocaleString() },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded border border-arena-border bg-black/40 px-3 py-2"
                      >
                        <p className="font-mono text-[9px] uppercase tracking-widest text-arena-muted">
                          {item.label}
                        </p>
                        <p
                          className="mt-1 font-pixel text-xl text-arena-text"
                          style={{ textShadow: '0 0 8px rgba(255,255,255,0.2)' }}
                        >
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="relative mt-4 rounded border border-arena-border bg-black/40 px-3 py-3 font-mono text-xs text-arena-muted">
                    No saved arena battles yet.
                  </p>
                )}
              </div>

              {/* Traits — unchanged */}
              {profile.traits && (
                <NormieTraitList
                  attributes={profile.traits.attributes}
                  highlightQuery={filters.traitSearch}
                />
              )}

              {/* Transform history — unchanged */}
              {profile.historyVersions.length > 0 && (
                <div>
                  <h3 className="mb-1.5 font-pixel text-[10px] uppercase text-arena-muted">
                    Transform history
                  </h3>
                  <ul className="max-h-28 space-y-1 overflow-y-auto font-mono text-xs text-arena-muted">
                    {profile.historyVersions.slice(0, 5).map((v) => (
                      <li key={v.version}>
                        v{v.version}: {v.changeCount} changes - {v.newPixelCount} px
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action buttons — unchanged */}
      <div className="flex flex-wrap gap-2 border-t border-arena-border pt-3">
        <Button
          type="button"
          variant={selected ? 'glow' : 'outline'}
          disabled={!selected && !canSelectMore}
          onClick={() => toggleSelection(normieId)}
        >
          <Swords className="h-4 w-4" />
          {selected ? 'Selected for battle' : 'Add to squad'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            const nowFav = toggleFavoriteNormieId(normieId)
            setFavorited(nowFav)
            onFavoriteChange?.()
          }}
        >
          {favorited ? 'Unfavorite' : 'Favorite'}
        </Button>

        {selectedIds.length > 0 && (
          <Button asChild variant="glow">
            <Link to="/battle">Battle ({selectedIds.length}/3)</Link>
          </Button>
        )}
      </div>
    </motion.div>
  )
}