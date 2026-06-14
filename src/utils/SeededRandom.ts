/**
 * seededRandom.ts
 *
 * Deterministic PRNG (mulberry32) seeded from a string.
 * Same seed → same sequence every time (replay-safe).
 * Different seed → different sequence (new battle feels different).
 *
 * Usage:
 *   const rng = createSeededRandom("1023-42-567-1716400000000")
 *   rng() // 0.0 – 1.0
 */

/**
 * Hash a string to a uint32 using the djb2 algorithm.
 * Fast, well-distributed for short strings like ID lists.
 */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0 // keep uint32
  }
  return hash
}

/**
 * mulberry32 — compact, high-quality 32-bit PRNG.
 * Returns a new function; each call advances the internal state.
 */
export function createSeededRandom(seed: string): () => number {
  let s = hashString(seed)
  return function (): number {
    s += 0x6d2b79f5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff
  }
}

/**
 * Build the battle seed string from fighter IDs + timestamp.
 *
 * Format: "p:1023,42|o:567,88|t:1716400000000"
 *   - Player IDs and opponent IDs are sorted within their groups
 *     so squad order doesn't affect the seed (consistent UX).
 *   - Timestamp makes every new battle unique even with the same squad.
 *   - Saved in the store → replays pass the same seed back → identical outcome.
 */
export function buildBattleSeed(
  playerIds: number[],
  opponentIds: number[],
  timestamp: number = Date.now(),
): string {
  const p = [...playerIds].sort((a, b) => a - b).join(',')
  const o = [...opponentIds].sort((a, b) => a - b).join(',')
  return `p:${p}|o:${o}|t:${timestamp}`
}