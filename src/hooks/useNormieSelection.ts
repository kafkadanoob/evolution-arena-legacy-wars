import { useContext } from 'react'
import { NormieSelectionContext } from '@/context/normie-selection-context'

export function useNormieSelection() {
  const ctx = useContext(NormieSelectionContext)
  if (!ctx) {
    throw new Error('useNormieSelection must be used within NormieSelectionProvider')
  }
  return ctx
}
