import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { NormieSelectionContext } from '@/context/normie-selection-context'

const MAX_SELECTION = 3

export function NormieSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((n) => n !== id)
      if (prev.length >= MAX_SELECTION) return prev
      return [...prev, id]
    })
  }, [])

  const removeSelection = useCallback((id: number) => {
    setSelectedIds((prev) => prev.filter((n) => n !== id))
  }, [])

  const clearSelection = useCallback(() => setSelectedIds([]), [])

  const value = useMemo(
    () => ({
      selectedIds,
      toggleSelection,
      removeSelection,
      clearSelection,
      isSelected: (id: number) => selectedIds.includes(id),
      canSelectMore: selectedIds.length < MAX_SELECTION,
    }),
    [selectedIds, toggleSelection, removeSelection, clearSelection],
  )

  return (
    <NormieSelectionContext.Provider value={value}>
      {children}
    </NormieSelectionContext.Provider>
  )
}
