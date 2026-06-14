const PLAYER_ID_KEY = 'evolution_arena_player_id'

function createPlayerId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `player_${crypto.randomUUID()}`
  }

  return `player_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export function getPlayerId() {
  let playerId = localStorage.getItem(PLAYER_ID_KEY)

  if (!playerId) {
    playerId = createPlayerId()
    localStorage.setItem(PLAYER_ID_KEY, playerId)
  }

  return playerId
}