/**
 * battleSimulator.ts  v4
 *
 * New mechanics:
 *   - Stance modifiers applied per attacker/defender pair
 *   - Momentum: consecutive attacks from same fighter build bonus damage
 *     (resets when target changes or fighter is swapped)
 *   - Synergy detection: checks squad trait composition, applies bonuses
 *   - Focus Fire: all alive allies target same opponent this turn
 *   - impactLevel on log entries (0–1) drives screen shake intensity in UI
 *   - Fast Forward: runBattleSimulation unchanged, UI controls speed
 */

import { createSeededRandom, buildBattleSeed } from '@/utils/SeededRandom'
import type {
  BattleFighter, BattleLogEntry, Difficulty, DifficultyConfig,
  DamagePreview, EvolutionResult, RoundSnapshot, TurnAction,
  SynergyBonus,
} from '@/types/battle.type'
import { DIFFICULTY_CONFIGS, STANCE_CONFIGS, SYNERGY_BONUSES } from '@/types/battle.type'
import type { NormieProfile } from '@/hooks/useNormieProfile'

const PIXEL_COUNT = 1600
const CRIT_CHANCE = 0.12
const TRAIT_VARIANCE = 0.20
const REGROW_RATE = 0.03
const POWER_MOVE_MULT = 2.5
const MOMENTUM_BONUS_PER_STACK = 0.08   // +8% per consecutive hit, max 3 stacks
const MAX_MOMENTUM = 3

// ─── Synergy detection ────────────────────────────────────────────────────────

export function detectSynergies(fighters: BattleFighter[]): SynergyBonus[] {
  return SYNERGY_BONUSES.filter((s) => {
    const count = fighters.filter((f) =>
      f.traits.some((t) => String(t.value).toLowerCase().includes(s.traitKey))
    ).length
    return count >= s.minCount
  })
}

export function getSynergyAttackMult(fighters: BattleFighter[]): number {
  const synergies = detectSynergies(fighters)
  // Multiply all offensive synergy bonuses together
  return synergies
    .filter((s) => s.bonusMult > 1)
    .reduce((acc, s) => acc * s.bonusMult, 1.0)
}

export function getSynergyDefenseMult(fighters: BattleFighter[]): number {
  const synergies = detectSynergies(fighters)
  // Defensive synergies have bonusMult < 1 (reduce incoming damage)
  return synergies
    .filter((s) => s.bonusMult < 1)
    .reduce((acc, s) => acc * s.bonusMult, 1.0)
}

// ─── Fighter builder ──────────────────────────────────────────────────────────

export function buildFighter(
  profile: Partial<NormieProfile> & { id: number },
  pixels: string,
  side: 'player' | 'opponent',
  config: DifficultyConfig,
): BattleFighter {
  const traits = profile.traits?.attributes ?? []
  const actionPoints = profile.canvasInfo?.actionPoints ?? 0
  const level = profile.canvasInfo?.level ?? 1
  const pixelCount = pixels.split('').filter((c: string) => c === '1').length
  const historyVersions = Array.isArray(profile.historyVersions)
    ? profile.historyVersions.length : 0

  const offensiveBonus = traits.filter((t) =>
    ['weapon','armor','fire','electric','alien','demon','robot'].some(
      (o) => String(t.value).toLowerCase().includes(o))
  ).length * 8

  const defensiveBonus = traits.filter((t) =>
    ['shield','holy','celestial','blessed','ancient'].some(
      (d) => String(t.value).toLowerCase().includes(d))
  ).length * 5

  const power = Math.round(
    pixelCount * 0.05 + actionPoints * 2 + level * 5 +
    (offensiveBonus + defensiveBonus) * config.traitWeight +
    historyVersions * 3 * config.historyWeight
  )

  const agentPersona = (profile.isAwakened && profile.agentName)
    ? buildPersona(profile) : null

  return {
    id: profile.id,
    pixels,
    originalPixels: pixels,
    traits,
    actionPoints,
    level,
    pixelCount,
    historyVersions,
    agentPersona,
    isAwakened: profile.isAwakened ?? false,
    side,
    hp: Math.max(10, pixelCount),
    maxHp: Math.max(10, pixelCount),
    power,
    eliminated: false,
    lastDamagedIndices: [],
    powerMoveUsed: false,
    stance: 'balanced',
    momentum: 0,
  }
}

function buildPersona(profile: Partial<NormieProfile> & { id: number }) {
  const name = profile.agentName ?? `Normie #${profile.id}`
  const traits = profile.traits?.attributes ?? []
  const personality = String(
    traits.find((t) => t.trait_type === 'Type')?.value ?? 'stoic'
  ).toLowerCase()
  const taunts: Record<string, string[]> = {
    human:  [`${name} surges forward.`, `"Your canvas ends here," ${name} growls.`, `${name} burns a path through the grid.`, `${name} strikes with precision.`],
    alien:  [`${name} warps reality.`, `Existence is optional, says ${name}.`, `${name} extends a chromatic tendril.`, `The grid bends to ${name}'s will.`],
    robot:  [`${name}: ATTACK_SEQUENCE_INITIATED.`, `Burn vector locked. ${name} fires.`, `${name} processes your weakness.`, `CRITICAL_DAMAGE_APPLIED.`],
    demon:  [`${name} tears through the canvas.`, `"Burn with me," ${name} whispers.`, `${name} leaves only void.`, `${name} feasts on fallen pixels.`],
  }
  return {
    name, personality,
    taunts: taunts[personality] ?? [`#${profile.id} strikes.`, `#${profile.id} channels pixels.`, `#${profile.id} burns bright.`],
    deathLines: [`${name} fades into the canvas.`, `#${profile.id}'s pixels scatter into the void.`],
  }
}

// ─── Damage preview ───────────────────────────────────────────────────────────

export function computeDamagePreview(
  attacker: BattleFighter,
  defender: BattleFighter,
  config: DifficultyConfig,
  squadFighters: BattleFighter[],
  isPowerMove = false,
): DamagePreview {
  const onCount = attacker.pixels.split('').filter((c: string) => c === '1').length
  const powerRatio = Math.min(2, attacker.power / Math.max(1, defender.power))
  const stanceAtk = STANCE_CONFIGS[attacker.stance].attackMult
  const stanceDef = STANCE_CONFIGS[defender.stance].defenseMult
  const synergyMult = getSynergyAttackMult(squadFighters)
  const momentumMult = 1 + Math.min(attacker.momentum, MAX_MOMENTUM) * MOMENTUM_BONUS_PER_STACK
  const moveMult = isPowerMove ? POWER_MOVE_MULT : 1

  const base = onCount * config.flipBudget * config.damageMultiplier * powerRatio * stanceAtk * stanceDef * synergyMult * momentumMult * moveMult
  const defOn = defender.pixels.split('').filter((c: string) => c === '1').length

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    minBurn: Math.min(Math.max(1, Math.floor(base * (1 - TRAIT_VARIANCE))), defOn),
    maxBurn: Math.min(Math.max(1, Math.floor(base * (1 + TRAIT_VARIANCE) * 2)), defOn),
    critChance: CRIT_CHANCE,
    isPowerMove,
    momentumBonus: attacker.momentum,
    synergyActive: synergyMult > 1,
  }
}

// ─── Single turn (step mode) ──────────────────────────────────────────────────

export function executeOneTurn(
  players: BattleFighter[],
  opponents: BattleFighter[],
  action: TurnAction,
  round: number,
  config: DifficultyConfig,
  rng: () => number,
): { snapshot: RoundSnapshot; battleOver: boolean } {
  const logs: BattleLogEntry[] = []
  const pixelChanges: Record<number, number[]> = {}
  let lc = 0
  const mkId = () => `t${round}-${++lc}`

  logs.push({ id: mkId(), type: 'round', round, text: `── Round ${round} ──`, timestamp: Date.now() })

  const squadFighters = players

  // Focus Fire: all alive players attack the same target
  const attackers = action.focusFire
    ? players.filter((f) => !f.eliminated)
    : [players.find((f) => f.id === action.attackerId)].filter(Boolean) as BattleFighter[]

  for (const attacker of attackers) {
    const defender = opponents.find((f) => f.id === action.defenderId)
    if (!attacker || !defender || attacker.eliminated || defender.eliminated) continue

    // Update momentum
    const lastTarget = (attacker as any)._lastTarget
    if (lastTarget === action.defenderId) {
      attacker.momentum = Math.min(attacker.momentum + 1, MAX_MOMENTUM)
    } else {
      attacker.momentum = 0
    }
    ;(attacker as any)._lastTarget = action.defenderId

    const { damaged, logs: atkLogs } = executeAttack(
      attacker, defender, round, config, rng,
      action.isPowerMove && !attacker.powerMoveUsed,
      squadFighters,
    )
    pixelChanges[defender.id] = (pixelChanges[defender.id] ?? []).concat(damaged)
    logs.push(...atkLogs)
    checkElimination(defender, round, mkId, logs)
  }

  // Log synergies if active
  const activeSynergies = detectSynergies(squadFighters)
  for (const syn of activeSynergies) {
    logs.push({ id: mkId(), type: 'synergy', round, text: `${syn.name}: ${syn.description}`, timestamp: Date.now() })
  }

  // Opponent counter-attacks
  for (const opp of opponents.filter((f) => !f.eliminated)) {
    const alivePlayers = players.filter((f) => !f.eliminated)
    if (alivePlayers.length === 0) break
    const target = alivePlayers[Math.floor(rng() * alivePlayers.length)]
    const { damaged, logs: atkLogs } = executeAttack(opp, target, round, config, rng, false, opponents)
    pixelChanges[target.id] = (pixelChanges[target.id] ?? []).concat(damaged)
    logs.push(...atkLogs)
    checkElimination(target, round, mkId, logs)
  }

  const snapshot: RoundSnapshot = {
    round,
    playerFighters: players.map(cloneFighter),
    opponentFighters: opponents.map(cloneFighter),
    logs,
    pixelChanges,
  }

  const battleOver = players.every((f) => f.eliminated) || opponents.every((f) => f.eliminated)
  return { snapshot, battleOver }
}

// ─── Full auto simulation ─────────────────────────────────────────────────────

export interface SimulationResult {
  snapshots: RoundSnapshot[]
  evolution: EvolutionResult
  winningSide: 'player' | 'opponent' | 'draw'
  totalRounds: number
  seed: string
}

export function runBattleSimulation(
  playerFighters: BattleFighter[],
  opponentFighters: BattleFighter[],
  difficulty: Difficulty,
  replaySeed?: string,
): SimulationResult {
  const config = DIFFICULTY_CONFIGS[difficulty]
  const seed = replaySeed ?? buildBattleSeed(
    playerFighters.map((f) => f.id),
    opponentFighters.map((f) => f.id),
    Date.now(),
  )
  const rng = createSeededRandom(seed)
  let players = playerFighters.map(cloneFighter)
  let opponents = opponentFighters.map(cloneFighter)
  const snapshots: RoundSnapshot[] = []
  let lid = 0
  const mkId = () => `log-${++lid}`

  for (let round = 1; round <= config.rounds; round++) {
    const roundLogs: BattleLogEntry[] = []
    const pixelChanges: Record<number, number[]> = {}
    roundLogs.push({ id: mkId(), type: 'round', round, text: `Round ${round}`, timestamp: Date.now() })

    const alivePlayers = players.filter((f) => !f.eliminated)
    const aliveOpponents = opponents.filter((f) => !f.eliminated)
    if (!alivePlayers.length || !aliveOpponents.length) break

    // Log synergies once per round
    for (const syn of detectSynergies(players)) {
      roundLogs.push({ id: mkId(), type: 'synergy', round, text: syn.name, timestamp: Date.now() })
    }

    for (const attacker of alivePlayers) {
      const target = aliveOpponents[Math.floor(rng() * aliveOpponents.length)]
      if (!target || target.eliminated) continue
      const lastTarget = (attacker as any)._lastTarget
      attacker.momentum = lastTarget === target.id
        ? Math.min(attacker.momentum + 1, MAX_MOMENTUM) : 0
      ;(attacker as any)._lastTarget = target.id
      const { damaged, logs } = executeAttack(attacker, target, round, config, rng, false, players)
      pixelChanges[target.id] = damaged
      roundLogs.push(...logs)
      checkElimination(target, round, mkId, roundLogs)
    }

    for (const attacker of opponents.filter((f) => !f.eliminated)) {
      const alivePl = players.filter((f) => !f.eliminated)
      if (!alivePl.length) break
      const target = alivePl[Math.floor(rng() * alivePl.length)]
      const { damaged, logs } = executeAttack(attacker, target, round, config, rng, false, opponents)
      pixelChanges[target.id] = (pixelChanges[target.id] ?? []).concat(damaged)
      roundLogs.push(...logs)
      checkElimination(target, round, mkId, roundLogs)
    }

    snapshots.push({
      round,
      playerFighters: players.map(cloneFighter),
      opponentFighters: opponents.map(cloneFighter),
      logs: roundLogs,
      pixelChanges,
    })
    if (players.every((f) => f.eliminated) || opponents.every((f) => f.eliminated)) break
  }

  const pPx = survivors(players)
  const oPx = survivors(opponents)
  const winningSide = pPx > oPx ? 'player' : oPx > pPx ? 'opponent' : 'draw'
  applyEvolution([...players, ...opponents], winningSide, rng)
  const evolution = buildEvolution([...players, ...opponents], [...playerFighters, ...opponentFighters], winningSide, snapshots.length)
  return { snapshots, evolution, winningSide, totalRounds: snapshots.length, seed }
}

// ─── Attack ───────────────────────────────────────────────────────────────────

function executeAttack(
  attacker: BattleFighter,
  defender: BattleFighter,
  round: number,
  config: DifficultyConfig,
  rng: () => number,
  isPowerMove: boolean,
  squadFighters: BattleFighter[],
): { damaged: number[]; logs: BattleLogEntry[] } {
  if (isPowerMove) attacker.powerMoveUsed = true

  const onIndices: number[] = []
  for (let i = 0; i < PIXEL_COUNT; i++) {
    if (attacker.pixels[i] === '1') onIndices.push(i)
  }

  const traitNoise = 1 + (rng() * 2 - 1) * TRAIT_VARIANCE
  const powerRatio = Math.min(2, (attacker.power / Math.max(1, defender.power)) * traitNoise)
  const isCrit = rng() < CRIT_CHANCE
  const critMult = isCrit ? 2.0 : 1.0
  const moveMult = isPowerMove ? POWER_MOVE_MULT : 1.0
  const stanceAtkMult = STANCE_CONFIGS[attacker.stance].attackMult
  const stanceDefMult = STANCE_CONFIGS[defender.stance].defenseMult
  const synergyMult = getSynergyAttackMult(squadFighters)
  const synergyDefMult = getSynergyDefenseMult(squadFighters.filter((f) => f.side === defender.side))
  const momentumMult = 1 + Math.min(attacker.momentum, MAX_MOMENTUM) * MOMENTUM_BONUS_PER_STACK

  const budget = Math.max(1, Math.floor(
    onIndices.length * config.flipBudget * config.damageMultiplier *
    powerRatio * critMult * moveMult *
    stanceAtkMult * stanceDefMult * synergyMult * synergyDefMult * momentumMult
  ))

  const pool = [...onIndices]
  const pickCount = Math.min(budget, pool.length)
  for (let i = 0; i < pickCount; i++) {
    const j = i + Math.floor(rng() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const defPixels = defender.pixels.split('')
  const damaged: number[] = []
  for (const idx of pool.slice(0, pickCount)) {
    if (defPixels[idx] === '1') { defPixels[idx] = '0'; damaged.push(idx) }
  }
  defender.pixels = defPixels.join('')
  defender.lastDamagedIndices = damaged
  defender.hp = defPixels.filter((c: string) => c === '1').length
  attacker.lastDamagedIndices = []

  // Impact level 0–1 for screen shake
  const impactLevel = Math.min(1, (damaged.length / Math.max(1, defender.maxHp * 0.3)) *
    (isPowerMove ? 2 : isCrit ? 1.5 : 1))

  const critTag = isCrit ? ' [CRIT]' : ''
  const moveTag = isPowerMove ? ' [POWER]' : ''
  const momTag = attacker.momentum >= 2 ? ` [MOM x${attacker.momentum}]` : ''

  const text = config.commentary && attacker.agentPersona
    ? attacker.agentPersona.taunts[round % attacker.agentPersona.taunts.length] + critTag + moveTag
    : `#${attacker.id} burns ${damaged.length}px from #${defender.id}.${critTag}${moveTag}${momTag}`

  const logs: BattleLogEntry[] = [{
    id: `atk-${attacker.id}-${defender.id}-${round}`,
    type: isPowerMove ? 'powermove' : isCrit ? 'taunt' : attacker.momentum >= 2 ? 'momentum' : 'attack',
    round,
    text,
    attackerId: attacker.id,
    defenderId: defender.id,
    affectedIndices: damaged,
    timestamp: Date.now(),
    impactLevel,
  }]

  if (config.commentary && attacker.isAwakened && round % 2 === 0 && attacker.agentPersona) {
    const t = attacker.agentPersona.taunts
    logs.push({ id: `taunt-${attacker.id}-${round}`, type: 'taunt', round, text: t[Math.floor(rng() * t.length)], attackerId: attacker.id, timestamp: Date.now() })
  }

  return { damaged, logs }
}

function checkElimination(f: BattleFighter, round: number, mkId: () => string, logs: BattleLogEntry[]) {
  if (f.eliminated || f.hp >= f.maxHp * 0.08) return
  f.eliminated = true
  f.hp = 0
  const line = f.agentPersona?.deathLines[0] ?? `#${f.id} is eliminated.`
  logs.push({ id: mkId(), type: 'elimination', round, text: line, defenderId: f.id, timestamp: Date.now(), impactLevel: 1 })
}

function applyEvolution(fighters: BattleFighter[], winningSide: string, rng: () => number) {
  for (const f of fighters) {
    const px = f.pixels.split('')
    if (f.side === winningSide || winningSide === 'draw') {
      const burned = px.map((v, i) => f.originalPixels[i] === '1' && v === '0' ? i : -1).filter((i) => i !== -1)
      const n = Math.floor(burned.length * REGROW_RATE)
      for (let i = 0; i < n; i++) {
        const j = i + Math.floor(rng() * (burned.length - i))
        ;[burned[i], burned[j]] = [burned[j], burned[i]]
        px[burned[i]] = '1'
      }
    } else {
      const on = px.map((v, i) => v === '1' ? i : -1).filter((i) => i !== -1)
      const n = Math.floor(on.length * 0.10)
      for (let i = 0; i < n; i++) {
        const j = i + Math.floor(rng() * (on.length - i))
        ;[on[i], on[j]] = [on[j], on[i]]
        px[on[i]] = '0'
      }
    }
    f.pixels = px.join('')
    f.hp = px.filter((c: string) => c === '1').length
  }
}

function buildEvolution(final: BattleFighter[], original: BattleFighter[], winningSide: string, rounds: number): EvolutionResult {
  const pixelSurvivalRate: Record<number, number> = {}
  const burnedIndices: Record<number, number[]> = {}
  const legacyScore: Record<number, number> = {}
  let winnerId: number | null = null

  for (const f of final) {
    const orig = original.find((o) => o.id === f.id)
    if (!orig) continue
    const origOn = orig.originalPixels.split('').filter((c: string) => c === '1').length
    const finalOn = f.pixels.split('').filter((c: string) => c === '1').length
    pixelSurvivalRate[f.id] = origOn > 0 ? finalOn / origOn : 0
    const burned: number[] = []
    for (let i = 0; i < PIXEL_COUNT; i++) {
      if (orig.originalPixels[i] === '1' && f.pixels[i] === '0') burned.push(i)
    }
    burnedIndices[f.id] = burned
    legacyScore[f.id] = Math.round((finalOn * (rounds / 10) + burned.length * 0.1) * (f.isAwakened ? 1.5 : 1.0))
  }

  const winners = final.filter((f) => f.side === winningSide)
  if (winners.length > 0) {
    winnerId = winners.reduce((best, f) => legacyScore[f.id] > (legacyScore[best] ?? 0) ? f.id : best, winners[0].id)
  }
  return { fighterIds: final.map((f) => f.id), winnerId, pixelSurvivalRate, burnedIndices, legacyScore }
}

function survivors(fighters: BattleFighter[]): number {
  return fighters.filter((f) => !f.eliminated)
    .reduce((s, f) => s + f.pixels.split('').filter((c: string) => c === '1').length, 0)
}

function cloneFighter(f: BattleFighter): BattleFighter {
  return { ...f, traits: [...f.traits], lastDamagedIndices: [...f.lastDamagedIndices] }
}

export function pickOpponentIds(playerIds: number[], count: number, rng = Math.random): number[] {
  const picked = new Set<number>(playerIds)
  const result: number[] = []
  let attempts = 0
  while (result.length < count && attempts < 200) {
    const id = Math.floor(rng() * 10000)
    if (!picked.has(id)) { picked.add(id); result.push(id) }
    attempts++
  }
  return result
}