import { supabase } from '@/lib/supabase'
import { getPlayerId } from '@/lib/player-id'
import type { BattleFighter, Difficulty } from '@/types/battle.type'

export type LegacyLeaderboardRow = {
  normie_id: number
  battles: number
  wins: number
  losses: number
  pixels_destroyed: number
  pixels_lost: number
  scar_count: number
  legacy_score: number
  best_legacy_delta: number
  updated_at: string
}

export type NormieBattleResult = {
  id: string
  battle_id: string
  normie_id: number
  side: string
  won: boolean
  starting_hp: number
  ending_hp: number
  pixels_destroyed: number
  pixels_lost: number
  damaged_pixels: number[]
  awakened: boolean
  legacy_delta: number
  created_at: string
}

type BattleWinner = 'player' | 'opponent' | 'draw'
type BattleMode = 'auto' | 'step'

type SubmitBattleResultInput = {
  battleMode: BattleMode
  difficulty: Difficulty
  winningSide: BattleWinner  
  playerFighters: BattleFighter[]
  opponentFighters: BattleFighter[]
  finalPlayerFighters: BattleFighter[]
  finalOpponentFighters: BattleFighter[]
  clientSubmissionKey?: string
}

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.15,
  hard: 1.35,
  legacy: 1.75,
}

function litPixelCount(pixels: string | undefined) {
  if (!pixels) return 0
  return pixels.split('').filter((pixel) => pixel === '1').length
}

function getAwakened(fighter: BattleFighter) {
  return Boolean(
    (fighter as unknown as { isAwakened?: boolean }).isAwakened ||
    (fighter as unknown as { profile?: { isAwakened?: boolean } }).profile?.isAwakened ||
    (fighter as unknown as { agentName?: string | null }).agentName,
  )
}

function getDamagedPixels(initial: BattleFighter, final: BattleFighter) {
  if (final.lastDamagedIndices?.length) {
    return Array.from(new Set(final.lastDamagedIndices))
  }

  const before = initial.originalPixels || initial.pixels
  const after = final.pixels
  const damaged: number[] = []

  for (let i = 0; i < Math.min(before.length, after.length); i += 1) {
    if (before[i] === '1' && after[i] === '0') damaged.push(i)
  }

  return damaged
}

function calculateLegacyDelta({
  won,
  pixelsDestroyed,
  pixelsLost,
  endingHp,
  awakened,
  difficulty,
}: {
  won: boolean
  pixelsDestroyed: number
  pixelsLost: number
  endingHp: number
  awakened: boolean
  difficulty: Difficulty
}) {
  const winBonus = won ? 120 : 20
  const awakenedBonus = awakened ? 1.5 : 1
  const raw =
    pixelsDestroyed * 0.55 +
    endingHp * 0.2 +
    winBonus -
    pixelsLost * 0.18

  return Math.max(
    0,
    Math.round(raw * DIFFICULTY_MULTIPLIER[difficulty] * awakenedBonus),
  )
}

function buildResultsForSide({
  side,
  won,
  difficulty,
  initialFighters,
  finalFighters,
  opposingInitialFighters,
  opposingFinalFighters,
}: {
  side: 'player' | 'opponent'
  won: boolean
  difficulty: Difficulty
  initialFighters: BattleFighter[]
  finalFighters: BattleFighter[]
  opposingInitialFighters: BattleFighter[]
  opposingFinalFighters: BattleFighter[]
}) {
  const totalOpposingLoss = opposingFinalFighters.reduce((sum, finalOpponent) => {
    const initialOpponent = opposingInitialFighters.find((fighter) => fighter.id === finalOpponent.id)
    const starting = initialOpponent?.hp ?? litPixelCount(initialOpponent?.originalPixels)
    return sum + Math.max(0, starting - finalOpponent.hp)
  }, 0)

  const damageShare = Math.round(totalOpposingLoss / Math.max(1, finalFighters.length))

  return finalFighters.map((finalFighter) => {
    const initialFighter =
      initialFighters.find((fighter) => fighter.id === finalFighter.id) ?? finalFighter

    const startingHp = initialFighter.hp ?? litPixelCount(initialFighter.originalPixels)
    const endingHp = finalFighter.hp ?? litPixelCount(finalFighter.pixels)
    const pixelsLost = Math.max(0, startingHp - endingHp)
    const damagedPixels = getDamagedPixels(initialFighter, finalFighter)
    const awakened = getAwakened(finalFighter)
    const legacyDelta = calculateLegacyDelta({
      won,
      pixelsDestroyed: damageShare,
      pixelsLost,
      endingHp,
      awakened,
      difficulty,
    })

    return {
      normie_id: finalFighter.id,
      side,
      won,
      starting_hp: startingHp,
      ending_hp: endingHp,
      pixels_destroyed: damageShare,
      pixels_lost: pixelsLost,
      damaged_pixels: damagedPixels,
      awakened,
      legacy_delta: legacyDelta,
    }
  })
}

async function fetchExistingBattleSummary(clientSubmissionKey: string) {
  const { data: existingBattle, error: battleError } = await supabase
    .from('battles')
    .select('id')
    .eq('client_submission_key', clientSubmissionKey)
    .maybeSingle()

  if (battleError) throw battleError
  if (!existingBattle) return null

  const { data: existingResults, error: resultsError } = await supabase
    .from('normie_battle_results')
    .select('legacy_delta, damaged_pixels')
    .eq('battle_id', existingBattle.id)

  if (resultsError) throw resultsError

  return {
    battleId: existingBattle.id as string,
    totalLegacyDelta: (existingResults ?? []).reduce(
      (sum, result) => sum + Number(result.legacy_delta ?? 0),
      0,
    ),
    totalScars: (existingResults ?? []).reduce(
      (sum, result) => sum + ((result.damaged_pixels as number[] | null)?.length ?? 0),
      0,
    ),
    alreadySaved: true,
  }
}

export async function submitBattleResult(input: SubmitBattleResultInput) {
  const playerId = getPlayerId()

  await supabase
    .from('players')
    .upsert({ id: playerId }, { onConflict: 'id' })

  if (input.clientSubmissionKey) {
  const existing = await fetchExistingBattleSummary(input.clientSubmissionKey)
  if (existing) return existing
    }

    const { data: battle, error: battleError } = await supabase
    .from('battles')
    .insert({
      player_id: playerId,
      battle_mode: input.battleMode,
      difficulty: input.difficulty,
      winner: input.winningSide,
      squad_ids: input.playerFighters.map((fighter) => fighter.id),
      opponent_ids: input.opponentFighters.map((fighter) => fighter.id),
      client_submission_key: input.clientSubmissionKey ?? null,
    })
    .select('id')
    .single()

    if (battleError) {
    if (input.clientSubmissionKey && battleError.code === '23505') {
      const existing = await fetchExistingBattleSummary(input.clientSubmissionKey)
      if (existing) return existing
    }

    throw battleError
  }

  const playerWon = input.winningSide === 'player'
  const opponentWon = input.winningSide === 'opponent'

  const results = [
    ...buildResultsForSide({
      side: 'player',
      won: playerWon,
      difficulty: input.difficulty,
      initialFighters: input.playerFighters,
      finalFighters: input.finalPlayerFighters,
      opposingInitialFighters: input.opponentFighters,
      opposingFinalFighters: input.finalOpponentFighters,
    }),
    ...buildResultsForSide({
      side: 'opponent',
      won: opponentWon,
      difficulty: input.difficulty,
      initialFighters: input.opponentFighters,
      finalFighters: input.finalOpponentFighters,
      opposingInitialFighters: input.playerFighters,
      opposingFinalFighters: input.finalPlayerFighters,
    }),
  ]

  const { error: resultsError } = await supabase
    .from('normie_battle_results')
    .insert(results.map((result) => ({ ...result, battle_id: battle.id })))

  if (resultsError) throw resultsError

  for (const result of results) {
    const { data: existing, error: existingError } = await supabase
      .from('normie_legacy_stats')
      .select('*')
      .eq('normie_id', result.normie_id)
      .maybeSingle()

    if (existingError) throw existingError

    const next = {
      normie_id: result.normie_id,
      battles: (existing?.battles ?? 0) + 1,
      wins: (existing?.wins ?? 0) + (result.won ? 1 : 0),
      losses: (existing?.losses ?? 0) + (result.won ? 0 : 1),
      pixels_destroyed: (existing?.pixels_destroyed ?? 0) + result.pixels_destroyed,
      pixels_lost: (existing?.pixels_lost ?? 0) + result.pixels_lost,
      scar_count: (existing?.scar_count ?? 0) + result.damaged_pixels.length,
      legacy_score: Number(existing?.legacy_score ?? 0) + result.legacy_delta,
      best_legacy_delta: Math.max(Number(existing?.best_legacy_delta ?? 0), result.legacy_delta),
      updated_at: new Date().toISOString(),
    }

    const { error: upsertError } = await supabase
      .from('normie_legacy_stats')
      .upsert(next, { onConflict: 'normie_id' })

    if (upsertError) throw upsertError
  }

  return {
    battleId: battle.id as string,
    totalLegacyDelta: results.reduce((sum, result) => sum + result.legacy_delta, 0),
    totalScars: results.reduce((sum, result) => sum + result.damaged_pixels.length, 0),
  }
}

export async function fetchLegacyLeaderboard(limit = 25) {
  const { data, error } = await supabase
    .from('normie_legacy_stats')
    .select('*')
    .order('legacy_score', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as LegacyLeaderboardRow[]
}

export async function fetchNormieBattleHistory(normieId: number, limit = 24) {
  const { data, error } = await supabase
    .from('normie_battle_results')
    .select('*')
    .eq('normie_id', normieId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as NormieBattleResult[]
}

export async function fetchNormieLegacyStats(normieId: number) {
  const { data, error } = await supabase
    .from('normie_legacy_stats')
    .select('*')
    .eq('normie_id', normieId)
    .maybeSingle()

  if (error) throw error
  return data as LegacyLeaderboardRow | null
}

export async function fetchLegacyMatchCount() {
  const { count, error } = await supabase
    .from('battles')
    .select('id', { count: 'exact', head: true })

  if (error) throw error
  return count ?? 0
}