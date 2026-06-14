import { coordToIndex } from '@/lib/pixels'
import type { CanvasDiff } from '@/types/normie'

export function diffToHighlightIndices(diff: CanvasDiff | null): {
  added: number[]
  removed: number[]
  all: number[]
} {
  if (!diff) return { added: [], removed: [], all: [] }
  const added = diff.added.map((p) => coordToIndex(p.x, p.y))
  const removed = diff.removed.map((p) => coordToIndex(p.x, p.y))
  return { added, removed, all: [...added, ...removed] }
}
