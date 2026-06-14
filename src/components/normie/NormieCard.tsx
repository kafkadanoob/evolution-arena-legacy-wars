/**
 * NormieCard.tsx  v4
 *
 * Changes from v3:
 *   1. Rendering fix: removed overflow-hidden from the art slot wrapper.
 *      This was clipping NormieRenderer's loading skeleton (NormieLoadingFace)
 *      which lives outside the canvas bounds during the loading state.
 *      Cards now show a pulsing skeleton border while art loads instead of
 *      a blank dark square.
 *
 *   2. Deselect button: when the Normie is selected (in squad), the + button
 *      becomes an arcade-style × that calls onDeselect. Includes a brief flash
 *      animation matching the existing +1 burst on select without looking like
 *      a generic error/delete control.
 *
 *   3. onDeselect prop added (optional). When absent, behaviour is unchanged.
 */

import { useCallback, useState } from 'react'
import { Check, Plus, Star, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { NormieRenderer } from '@/components/normie/NormieRenderer'
import { Badge } from '@/components/ui/badge'
import { SquadAddBurst } from '@/components/battle/SquadAddBurst'
import { cn } from '@/lib/utils'

const SCALE = 3
const ART_SIZE = 40 * SCALE
const CARD_WIDTH = ART_SIZE + 16

interface NormieCardProps {
  normieId: number
  selected?: boolean
  favorited?: boolean
  subtitle?: string
  actionPoints?: number
  customized?: boolean
  onSelect?: () => void
  onDeselect?: () => void
  onToggleFavorite?: () => void
  onQuickAdd?: () => void
}

export function NormieCard({
  normieId,
  selected = false,
  favorited = false,
  subtitle,
  actionPoints,
  customized,
  onSelect,
  onDeselect,
  onToggleFavorite,
  onQuickAdd,
}: NormieCardProps) {
  const [burst, setBurst] = useState(false)
  const [bounce, setBounce] = useState(false)
  const [deselectFlash, setDeselectFlash] = useState(false)

  const handleQuickAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onQuickAdd?.()
    setBurst(true)
    setBounce(true)
    setTimeout(() => setBounce(false), 300)
  }, [onQuickAdd])

  const handleDeselect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setDeselectFlash(true)
    setTimeout(() => setDeselectFlash(false), 300)
    onDeselect?.()
  }, [onDeselect])

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.()
        }
      }}
      style={{ width: CARD_WIDTH }}
      className={cn(
        'normie-card group relative flex flex-col transition-all duration-150',
        'hover:scale-105 hover:shadow-[0_0_0_2px_#22c55e55]',
        selected && 'normie-card--selected shadow-[0_0_0_2px_#22c55e]',
        deselectFlash && 'shadow-[0_0_0_2px_#ff4d6d]',
      )}
    >
      {selected && !onDeselect && (
        <span className="absolute right-1.5 top-1.5 z-10 text-arena-glow">
          <Check className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}

      {selected && onDeselect && (
        <motion.button
          type="button"
          aria-label={`Remove Normie #${normieId} from squad`}
          onClick={handleDeselect}
          initial={false}
          animate={deselectFlash ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.22 }}
          className={cn(
            'absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center',
            'rounded border border-white/70 bg-[#101010] text-white',
            'shadow-[0_0_8px_#ffffff33] transition-all',
            'hover:scale-110 hover:border-[#ff4d6d] hover:bg-[#1a0b10]',
            'hover:text-[#ff6b81] hover:shadow-[0_0_10px_#ff4d6d99]',
          )}
        >
          <X className="h-3 w-3" strokeWidth={3} />
        </motion.button>
      )}

      {onQuickAdd && !selected && (
        <button
          type="button"
          aria-label={`Add Normie #${normieId} to squad`}
          onClick={handleQuickAdd}
          className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#22c55e] text-black opacity-0 shadow-[0_0_8px_#22c55e80] transition-all group-hover:opacity-100 hover:scale-110 hover:bg-white"
        >
          <Plus className="h-3 w-3" strokeWidth={3} />
        </button>
      )}

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
          className={cn(
            'absolute left-1.5 top-1.5 z-10 rounded p-0.5 transition-colors',
            favorited ? 'text-arena-glow' : 'text-arena-muted opacity-0 group-hover:opacity-100',
          )}
          aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
        >
          <Star className={cn('h-3 w-3', favorited && 'fill-current')} />
        </button>
      )}

      <motion.div
        className="relative mx-auto mt-2 mb-1 flex-shrink-0"
        style={{ width: ART_SIZE, height: ART_SIZE }}
        animate={bounce ? { scale: [1, 1.18, 0.93, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <NormieRenderer
          normieId={normieId}
          scale={SCALE}
          showBorder={false}
          interactive={false}
          minimal
        />
        <SquadAddBurst trigger={burst} onDone={() => setBurst(false)} />
      </motion.div>

      <div
        className="normie-card__meta border-t border-arena-border/80 px-2 py-1.5 text-center"
        style={{ minHeight: 44 }}
      >
        <p className="font-pixel text-[8px] text-arena-text">#{normieId}</p>
        {subtitle && (
          <p className="truncate text-[9px] text-arena-muted">{subtitle}</p>
        )}
        <div className="flex min-h-[16px] flex-wrap justify-center gap-1">
          {customized && <Badge variant="glow">Canvas</Badge>}
          {actionPoints != null && actionPoints > 0 && (
            <Badge variant="muted">{actionPoints} AP</Badge>
          )}
        </div>
      </div>
    </div>
  )
}