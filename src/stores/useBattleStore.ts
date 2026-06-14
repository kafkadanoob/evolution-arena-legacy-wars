/**
 * useBattleStore.ts  v3
 *
 * Added:
 * - battleMode: 'auto' | 'step'
 * - livePlayers / liveOpponents: mutable fighter state for step mode
 * - currentStepRound: tracks which round step mode is on
 * - powerMoveAvailable: one per battle, consumed on use
 * - pendingAction: the TurnAction player has selected but not confirmed
 * - stepModeRng: seeded RNG instance shared across all step-mode turns
 */

import { create } from 'zustand'
import type {
  BattleFighter,
  BattleLogEntry,
  BattleMode,
  BattlePhase,
  Difficulty,
  EvolutionResult,
  RoundSnapshot,
  TurnAction,
} from '@/types/battle.type'
import { createSeededRandom } from '@/utils/SeededRandom'

interface BattleStore {
  // ── Config ──
  difficulty: Difficulty
  battleMode: BattleMode
  setDifficulty: (d: Difficulty) => void
  setBattleMode: (m: BattleMode) => void

  // ── Static fighters (original load) ──
  playerFighters: BattleFighter[]
  opponentFighters: BattleFighter[]
  setPlayerFighters: (f: BattleFighter[]) => void
  setOpponentFighters: (f: BattleFighter[]) => void

  // ── Live fighters (mutated during step mode) ──
  livePlayers: BattleFighter[]
  liveOpponents: BattleFighter[]
  setLiveFighters: (p: BattleFighter[], o: BattleFighter[]) => void
  updateLiveFighter: (id: number, patch: Partial<BattleFighter>) => void

  // ── Auto mode: snapshots ──
  snapshots: RoundSnapshot[]
  setSnapshots: (s: RoundSnapshot[]) => void
  currentRound: number
  isAutoPlaying: boolean
  setCurrentRound: (r: number) => void
  stepForward: () => void
  stepBackward: () => void
  setAutoPlaying: (v: boolean) => void

  // ── Step mode ──
  currentStepRound: number
  incrementStepRound: () => void
  pendingAction: TurnAction | null
  setPendingAction: (a: TurnAction | null) => void
  powerMoveAvailable: boolean
  consumePowerMove: () => void

  // ── Seeded RNG for step mode (persists across turns) ──
  stepRng: (() => number) | null
  initStepRng: (seed: string) => void

  // ── Phase ──
  phase: BattlePhase
  setPhase: (p: BattlePhase) => void

  // ── Log ──
  visibleLogs: BattleLogEntry[]
  allLogs: BattleLogEntry[]
  appendLogs: (logs: BattleLogEntry[]) => void
  clearLogs: () => void

  // ── Results ──
  evolution: EvolutionResult | null
  winningSide: 'player' | 'opponent' | 'draw' | null
  battleSeed: string | null
  setResult: (e: EvolutionResult, w: 'player' | 'opponent' | 'draw', seed: string) => void

  // ── Reset ──
  resetBattle: () => void
}

const VISIBLE_LOG_LIMIT = 8

export const useBattleStore = create<BattleStore>((set, get) => ({
  difficulty: 'medium',
  battleMode: 'auto',
  setDifficulty: (difficulty) => set({ difficulty }),
  setBattleMode: (battleMode) => set({ battleMode }),

  playerFighters: [],
  opponentFighters: [],
  setPlayerFighters: (playerFighters) => set({ playerFighters }),
  setOpponentFighters: (opponentFighters) => set({ opponentFighters }),

  livePlayers: [],
  liveOpponents: [],
  setLiveFighters: (livePlayers, liveOpponents) => set({ livePlayers, liveOpponents }),
  updateLiveFighter: (id, patch) => set((s) => ({
    livePlayers: s.livePlayers.map((f) => f.id === id ? { ...f, ...patch } : f),
    liveOpponents: s.liveOpponents.map((f) => f.id === id ? { ...f, ...patch } : f),
  })),

  snapshots: [],
  setSnapshots: (snapshots) => set({ snapshots }),
  currentRound: 0,
  isAutoPlaying: false,
  setCurrentRound: (currentRound) => set({ currentRound }),
  stepForward: () => {
    const { currentRound, snapshots, appendLogs } = get()
    const next = currentRound + 1
    if (next > snapshots.length) return
    const snap = snapshots[next - 1]
    if (snap) appendLogs(snap.logs)
    set({ currentRound: next })
  },
  stepBackward: () => {
    const { currentRound } = get()
    if (currentRound <= 1) return
    set({ currentRound: currentRound - 1 })
  },
  setAutoPlaying: (isAutoPlaying) => set({ isAutoPlaying }),

  currentStepRound: 1,
  incrementStepRound: () => set((s) => ({ currentStepRound: s.currentStepRound + 1 })),
  pendingAction: null,
  setPendingAction: (pendingAction) => set({ pendingAction }),
  powerMoveAvailable: true,
  consumePowerMove: () => set({ powerMoveAvailable: false }),

  stepRng: null,
  initStepRng: (seed) => set({ stepRng: createSeededRandom(seed) }),

  phase: 'setup',
  setPhase: (phase) => set({ phase }),

  visibleLogs: [],
  allLogs: [],
  appendLogs: (logs) => set((s) => ({
    allLogs: [...s.allLogs, ...logs],
    // Keep only the last VISIBLE_LOG_LIMIT entries visible in the arcade log
    visibleLogs: [...s.visibleLogs, ...logs].slice(-VISIBLE_LOG_LIMIT),
  })),
  clearLogs: () => set({ visibleLogs: [], allLogs: [] }),

  evolution: null,
  winningSide: null,
  battleSeed: null,
  setResult: (evolution, winningSide, battleSeed) => set({ evolution, winningSide, battleSeed }),

  resetBattle: () => set({
    phase: 'setup',
    snapshots: [],
    currentRound: 0,
    currentStepRound: 1,
    isAutoPlaying: false,
    visibleLogs: [],
    allLogs: [],
    evolution: null,
    winningSide: null,
    battleSeed: null,
    playerFighters: [],
    opponentFighters: [],
    livePlayers: [],
    liveOpponents: [],
    pendingAction: null,
    powerMoveAvailable: true,
    stepRng: null,
  }),
}))