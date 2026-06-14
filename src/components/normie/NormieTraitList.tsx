import type { NormieTraitAttribute } from '@/types/normie'
import { cn } from '@/lib/utils'

interface NormieTraitListProps {
  attributes: NormieTraitAttribute[]
  highlightQuery?: string
  className?: string
}

export function NormieTraitList({
  attributes,
  highlightQuery = '',
  className,
}: NormieTraitListProps) {
  const q = highlightQuery.trim().toLowerCase()

  return (
    <ul className={cn('grid gap-2 sm:grid-cols-2', className)}>
      {attributes
        .filter((attr) => !attr.display_type)
        .map((attr) => {
          const traitType = String(attr.trait_type ?? '')
          const value = String(attr.value ?? '')

          const match =
            q !== '' &&
            (value.toLowerCase().includes(q) ||
              traitType.toLowerCase().includes(q))

          return (
            <li
              key={`${traitType}-${value}`}
              className={cn(
                'rounded border border-arena-border px-3 py-2',
                match && 'border-arena-glow/50 bg-arena-glow/5',
              )}
            >
              <span className="block text-[10px] uppercase tracking-wide text-arena-muted">
                {traitType}
              </span>
              <span className="text-sm text-arena-text">{value}</span>
            </li>
          )
        })}
    </ul>
  )
}