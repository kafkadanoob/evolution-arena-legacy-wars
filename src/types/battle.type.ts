/**
 * battle.type.ts  v4
 * Added: Stance, SynergyBonus, momentum tracking on BattleFighter
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'legacy'

export interface DifficultyConfig {
  label: string
  rounds: number
  flipBudget: number
  traitWeight: number
  historyWeight: number
  commentary: boolean
  damageMultiplier: number
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy:   { label: 'Easy',   rounds: 3,  flipBudget: 0.05, traitWeight: 0.2, historyWeight: 0.1, commentary: false, damageMultiplier: 0.6 },
  medium: { label: 'Medium', rounds: 5,  flipBudget: 0.10, traitWeight: 0.4, historyWeight: 0.3, commentary: false, damageMultiplier: 1.0 },
  hard:   { label: 'Hard',   rounds: 7,  flipBudget: 0.15, traitWeight: 0.6, historyWeight: 0.5, commentary: true,  damageMultiplier: 1.4 },
  legacy: { label: 'Legacy', rounds: 10, flipBudget: 0.22, traitWeight: 1.0, historyWeight: 1.0, commentary: true,  damageMultiplier: 2.0 },
}

// ─── Stance ───────────────────────────────────────────────────────────────────

export type Stance = 'aggressive' | 'defensive' | 'balanced'

export interface StanceConfig {
  label: string
  tooltip: string
  /** Multiplier applied to outgoing damage */
  attackMult: number
  /** Multiplier applied to incoming damage (< 1 = less damage taken) */
  defenseMult: number
  color: string
}

export const STANCE_CONFIGS: Record<Stance, StanceConfig> = {
  aggressive: {
    label: 'Aggressive',
    tooltip: '+30% damage dealt, +20% damage taken. High risk, high reward.',
    attackMult: 1.30,
    defenseMult: 1.20,
    color: 'text-red-400',
  },
  defensive: {
    label: 'Defensive',
    tooltip: '−20% damage dealt, −35% damage taken. Survive longer, deal less.',
    attackMult: 0.80,
    defenseMult: 0.65,
    color: 'text-blue-400',
  },
  balanced: {
    label: 'Balanced',
    tooltip: 'No modifiers. Consistent performance across all situations.',
    attackMult: 1.00,
    defenseMult: 1.00,
    color: 'text-arena-glow',
  },
}

// ─── Synergy ──────────────────────────────────────────────────────────────────

export interface SynergyBonus {
  name: string
  description: string
  /** Extra damage multiplier when synergy is active */
  bonusMult: number
  traitKey: string   // the trait value keyword that triggers this
  minCount: number   // how many fighters need this trait
}

export const SYNERGY_BONUSES: SynergyBonus[] = [
  { name: 'Alien Hive',    description: '2+ Aliens: +25% attack power', bonusMult: 1.25, traitKey: 'alien',   minCount: 2 },
  { name: 'Demon Pact',    description: '2+ Demons: +20% burn chance',  bonusMult: 1.20, traitKey: 'demon',   minCount: 2 },
  { name: 'Robo Network',  description: '2+ Robots: crits deal 3× dmg', bonusMult: 1.15, traitKey: 'robot',   minCount: 2 },
  { name: 'Holy Trinity',  description: '2+ Holy: −40% incoming damage',bonusMult: 0.60, traitKey: 'holy',    minCount: 2 },
  { name: 'Human Spirit',  description: '3 Humans: momentum bonus +1',  bonusMult: 1.10, traitKey: 'human',   minCount: 3 },
]

// ─── Fighter ──────────────────────────────────────────────────────────────────

export interface AgentPersona {
  name: string
  personality: string
  taunts: string[]
  deathLines: string[]
}

export interface BattleFighter {
  id: number
  pixels: string
  originalPixels: string
  traits: Array<{ trait_type: string; value: string | number }>
  actionPoints: number
  level: number
  pixelCount: number
  historyVersions: number
  agentPersona: AgentPersona | null
  isAwakened: boolean
  side: 'player' | 'opponent'
  hp: number
  maxHp: number
  power: number
  eliminated: boolean
  lastDamagedIndices: number[]
  powerMoveUsed: boolean
  stance: Stance
  /** Consecutive rounds this fighter has attacked — resets on target switch */
  momentum: number
}

// ─── Damage preview ──────────────────────────────────────────────────────────

export interface DamagePreview {
  attackerId: number
  defenderId: number
  minBurn: number
  maxBurn: number
  critChance: number
  isPowerMove: boolean
  momentumBonus: number
  synergyActive: boolean
}

// ─── Turn action ─────────────────────────────────────────────────────────────

export interface TurnAction {
  attackerId: number
  defenderId: number
  isPowerMove: boolean
  focusFire: boolean   // all alive friendlies attack same target
}

// ─── Log ─────────────────────────────────────────────────────────────────────

export type LogEntryType = 'attack' | 'taunt' | 'elimination' | 'round' | 'system' | 'powermove' | 'synergy' | 'momentum'

export interface BattleLogEntry {
  id: string
  type: LogEntryType
  round: number
  text: string
  attackerId?: number
  defenderId?: number
  affectedIndices?: number[]
  timestamp: number
  /** drives screen-shake + flash intensity: 0–1 */
  impactLevel?: number
}

// ─── Round snapshot ───────────────────────────────────────────────────────────

export interface RoundSnapshot {
  round: number
  playerFighters: BattleFighter[]
  opponentFighters: BattleFighter[]
  logs: BattleLogEntry[]
  pixelChanges: Record<number, number[]>
}

// ─── Phase ────────────────────────────────────────────────────────────────────

export type BattlePhase =
  | 'setup'
  | 'loading'
  | 'tactics'          // NEW: pre-battle stance assignment
  | 'ready'
  | 'fighting'
  | 'awaiting_input'
  | 'paused'
  | 'results'

export type BattleMode = 'auto' | 'step'

// ─── Evolution ────────────────────────────────────────────────────────────────

export interface EvolutionResult {
  fighterIds: number[]
  winnerId: number | null
  pixelSurvivalRate: Record<number, number>
  burnedIndices: Record<number, number[]>
  legacyScore: Record<number, number>
}