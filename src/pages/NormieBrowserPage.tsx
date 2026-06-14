/**
 * NormieBrowserPage.tsx
 *
 * Changes from previous version:
 *
 * 1. FILTERS WIRED UP
 *    - Trait search: case-insensitive partial match against agent trait data.
 *      Applied to Awakened Agents section (has trait data from useFeaturedAgents).
 *      Recent section: trait filtering skipped (no cached trait data per ID —
 *      would require N API calls). A note is shown when trait filter is active.
 *    - Customized only: filters Awakened Agents by agent.customized flag.
 *      Recent section: cannot filter without fetched data, same caveat.
 *    - Min action points: filters Awakened Agents by agent.actionPoints.
 *
 * 2. DESELECT WIRED
 *    - NormieCard in Battle Squad section now receives onDeselect prop.
 *    - Calls toggleSelection(id) which removes from squad via useNormieSelection.
 *
 * 3. SECTION COUNT
 *    - Recent and Awakened both show up to 20 items.
 *
 * 4. SECTION HEADINGS
 *    - Battle Squad, Recent, Favorites, Results, and Awakened Agents headings
 *      now render in white for stronger arcade readability.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NormiesApiError } from '@/api/client'
import { getHolderNormies } from '@/api/normie'
import { NormieCard } from '@/components/normie/NormieCard'
import { NormieDetailPanel } from '@/components/normie/NormieDetailPanel'
import { NormieFilters } from '@/components/browser/NormieFilters'
import { NormieSearchBar, type SearchMode } from '@/components/browser/NormieSearchBar'
import { Badge } from '@/components/ui/badge'
import { useFeaturedAgents } from '@/hooks/useFeaturedAgents'
import { useNormieSelection } from '@/hooks/useNormieSelection'
import {
  getFavoriteNormieIds,
  getRecentNormieIds,
  pushRecentNormieId,
  toggleFavoriteNormieId,
} from '@/lib/normie-storage'
import { clampNormieId, isValidNormieId } from '@/lib/utils'
import {
  DEFAULT_BROWSER_FILTERS,
  type BrowserFilters,
} from '@/types/browser'

export function NormieBrowserPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedIds, isSelected, toggleSelection, canSelectMore } = useNormieSelection()

  const urlId = searchParams.get('id')
  const urlParsedId =
    urlId != null && isValidNormieId(Number(urlId)) ? Number(urlId) : null

  const [mode, setMode] = useState<SearchMode>('id')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<BrowserFilters>(DEFAULT_BROWSER_FILTERS)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [gridIds, setGridIds] = useState<number[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<number[]>(() => getFavoriteNormieIds())
  const [recent, setRecent] = useState<number[]>(() => getRecentNormieIds())

  const { agents, loading: agentsLoading } = useFeaturedAgents()

  const featuredIds = useMemo(
    () => agents.map((a) => clampNormieId(Number(a.tokenId))),
    [agents],
  )

  const detailRef = useRef<HTMLDivElement>(null)

  const selectNormie = useCallback(
    (id: number) => {
      const clamped = clampNormieId(id)
      setActiveId(clamped)
      pushRecentNormieId(clamped)
      setRecent(getRecentNormieIds())
      setSearchParams({ id: String(clamped) }, { replace: true })
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    },
    [setSearchParams],
  )

  useEffect(() => {
    if (urlParsedId != null) {
      setGridIds([urlParsedId])
      selectNormie(urlParsedId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = useCallback(async () => {
    setSearchError(null)
    setSearchLoading(true)

    try {
      if (mode === 'id') {
        const trimmed = query.trim()
        const parsed = Number(trimmed)

        if (trimmed === '' || Number.isNaN(parsed)) {
          setSearchError('Enter a valid Normie ID (0–9999)')
          return
        }

        const id = clampNormieId(parsed)
        setGridIds([id])
        selectNormie(id)
      } else {
        const addr = query.trim()

        if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
          setSearchError('Enter a valid 0x… Ethereum address')
          return
        }

        const { tokenIds } = await getHolderNormies(addr)
        const ids = tokenIds.map((t) => clampNormieId(Number(t))).slice(0, 48)

        if (ids.length === 0) {
          setSearchError('No Normies found for this wallet')
          setGridIds([])
          return
        }

        setGridIds(ids)
        selectNormie(ids[0])
      }
    } catch (e) {
      setSearchError(
        e instanceof NormiesApiError ? e.message
          : e instanceof Error ? e.message
            : 'Search failed',
      )
    } finally {
      setSearchLoading(false)
    }
  }, [mode, query, selectNormie])

  const handleRandom = useCallback(() => {
    const id = Math.floor(Math.random() * 10000)
    setQuery(String(id))
    setMode('id')
    setGridIds([id])
    selectNormie(id)
  }, [selectNormie])

  const refreshFavorites = () => setFavorites(getFavoriteNormieIds())

  const traitQuery = filters.traitSearch?.trim().toLowerCase() ?? ''
  const customizedOnly = filters.customizedOnly ?? false
  const minAP = filters.minActionPoints ?? 0
  const hasActiveFilter = traitQuery !== '' || customizedOnly || minAP > 0

  const agentMatchesFilters = useCallback((agent: {
    tokenId: string | number
    traits?: Array<{ trait_type: string; value: string | number }>
    customized?: boolean
    actionPoints?: number
  }) => {
    if (traitQuery !== '') {
      const traits = agent.traits ?? []
      const matches = traits.some(
        (t) =>
          String(t.trait_type).toLowerCase().includes(traitQuery) ||
          String(t.value).toLowerCase().includes(traitQuery),
      )

      if (!matches) return false
    }

    if (customizedOnly && !agent.customized) return false
    if (minAP > 0 && (agent.actionPoints ?? 0) < minAP) return false

    return true
  }, [traitQuery, customizedOnly, minAP])

  const displaySections = useMemo(() => {
    const sections: { title: string; ids: number[]; filterNote?: string }[] = []

    if (selectedIds.length > 0) {
      sections.push({ title: 'Battle squad', ids: selectedIds })
    }

    if (favorites.length > 0) {
      sections.push({
        title: 'Favorites',
        ids: favorites.filter((id) => !selectedIds.includes(id)),
      })
    }

    if (recent.length > 0) {
      const recentIds = recent
        .filter((id) => !favorites.includes(id) && !selectedIds.includes(id))
        .slice(0, 20)

      sections.push({
        title: 'Recent',
        ids: recentIds,
        filterNote: hasActiveFilter
          ? 'Trait/customized filters apply to Awakened Agents only'
          : undefined,
      })
    }

    if (featuredIds.length > 0) {
      const filteredAgents = hasActiveFilter
        ? agents.filter(agentMatchesFilters)
        : agents

      const filteredIds = filteredAgents
        .map((a) => clampNormieId(Number(a.tokenId)))
        .filter(
          (id) =>
            !gridIds.includes(id) &&
            !recent.includes(id) &&
            !favorites.includes(id),
        )
        .slice(0, 20)

      if (filteredIds.length > 0 || !hasActiveFilter) {
        sections.push({
          title: 'Awakened agents',
          ids: filteredIds,
        })
      }
    }

    if (gridIds.length > 0) {
      sections.push({ title: 'Results', ids: gridIds })
    }

    return sections.filter((s) => s.ids.length > 0)
  }, [selectedIds, favorites, recent, featuredIds, gridIds, agents, hasActiveFilter, agentMatchesFilters])

  return (
    <div className="min-w-0 space-y-8 overflow-x-hidden">
      <header className="space-y-2">
        <h1 className="font-pixel text-sm text-arena-text">Normie Browser</h1>
        <p className="max-w-2xl text-sm text-arena-muted">
          Search by ID or wallet, filter by traits and canvas stats, preview live
          pixels and diffs. Select up to 3 fighters for the arena.
        </p>
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id) => (
              <Badge key={id} variant="glow">#{id}</Badge>
            ))}
          </div>
        )}
      </header>

      <NormieSearchBar
        mode={mode}
        onModeChange={setMode}
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        onRandom={handleRandom}
        loading={searchLoading}
      />

      {searchError && (
        <p className="text-sm text-arena-danger" role="alert">{searchError}</p>
      )}

      <div className="grid min-w-0 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <NormieFilters
            filters={filters}
            onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
          />
        </aside>

        <div className="min-w-0 space-y-8">
          {activeId != null && (
            <div ref={detailRef}>
              <NormieDetailPanel
                normieId={activeId}
                filters={filters}
                onFavoriteChange={refreshFavorites}
                onBack={() => {
                  setActiveId(null)
                  setQuery('')
                  setGridIds([])
                }}
              />
            </div>
          )}

          {displaySections.map((section) => (
            <section key={section.title}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-pixel text-[10px] uppercase tracking-widest text-white">
                  {section.title}
                  {section.title === 'Awakened agents' && agentsLoading && ' …'}
                </h2>
                {section.filterNote && (
                  <span className="font-mono text-[9px] text-arena-border">
                    ({section.filterNote})
                  </span>
                )}
              </div>

              <div className="grid auto-rows-auto justify-items-start gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {section.ids.map((id) => {
                  const agent = agents.find((a) => Number(a.tokenId) === id)
                  const inSquad = isSelected(id)

                  return (
                    <NormieCard
                      key={`${section.title}-${id}`}
                      normieId={id}
                      selected={inSquad}
                      favorited={favorites.includes(id)}
                      subtitle={agent?.name ?? agent?.type}
                      onSelect={() => selectNormie(id)}
                      onDeselect={
                        section.title === 'Battle squad' && inSquad
                          ? () => toggleSelection(id)
                          : undefined
                      }
                      onToggleFavorite={() => {
                        toggleFavoriteNormieId(id)
                        refreshFavorites()
                      }}
                      onQuickAdd={
                        !inSquad && canSelectMore
                          ? () => toggleSelection(id)
                          : undefined
                      }
                    />
                  )
                })}
              </div>
            </section>
          ))}

          {displaySections.length === 0 && !agentsLoading && (
            <p className="text-center text-sm text-arena-muted py-12">
              Search an ID, paste a wallet, or hit Random to begin.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}