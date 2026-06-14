import { Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { BrowserFilters } from '@/types/browser'
import { cn } from '@/lib/utils'

interface NormieFiltersProps {
  filters: BrowserFilters
  onChange: (patch: Partial<BrowserFilters>) => void
  className?: string
}

export function NormieFilters({ filters, onChange, className }: NormieFiltersProps) {
  return (
    <div className={cn('space-y-4 rounded-lg border border-arena-border p-4', className)}>
      <div className="flex items-center gap-2 font-pixel text-[10px] uppercase text-arena-muted">
        <Filter className="h-3.5 w-3.5" />
        Filters
      </div>

      <div>
        <label htmlFor="trait-filter" className="mb-1 block text-xs text-arena-muted">
          Trait search
        </label>
        <Input
          id="trait-filter"
          placeholder="e.g. Top Hat, Alien…"
          value={filters.traitSearch}
          onChange={(e) => onChange({ traitSearch: e.target.value })}
        />
      </div>

      <div>
        <label htmlFor="ap-filter" className="mb-1 block text-xs text-arena-muted">
          Min action points
        </label>
        <Input
          id="ap-filter"
          type="number"
          min={0}
          value={filters.minActionPoints || ''}
          onChange={(e) =>
            onChange({ minActionPoints: Math.max(0, Number(e.target.value) || 0) })
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <FilterToggle
          label="Customized only"
          checked={filters.customizedOnly}
          onChange={(customizedOnly) => onChange({ customizedOnly })}
        />
        <FilterToggle
          label="Customized only"
          checked={filters.customizedOnly}
          onChange={(customizedOnly) => onChange({ customizedOnly })}
        />

        <FilterToggle
          label="Awakened agents only"
          checked={filters.awakenedOnly}
          onChange={(awakenedOnly) => onChange({ awakenedOnly })}
        />
      </div>
    </div>
  )
}

function FilterToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-arena-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-arena-glow"
      />
      {label}
    </label>
  )
}
