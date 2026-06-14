import { createContext } from 'react'

export interface NormieSelectionContextValue {
  selectedIds: number[]
  toggleSelection: (id: number) => void
  removeSelection: (id: number) => void
  clearSelection: () => void
  isSelected: (id: number) => boolean
  canSelectMore: boolean
}

export const NormieSelectionContext =
  createContext<NormieSelectionContextValue | null>(null)
