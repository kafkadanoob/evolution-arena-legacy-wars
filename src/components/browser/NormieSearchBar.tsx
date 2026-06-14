import { Search, Wallet, Dices } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export type SearchMode = 'id' | 'owner'

interface NormieSearchBarProps {
  mode: SearchMode
  onModeChange: (mode: SearchMode) => void
  query: string
  onQueryChange: (q: string) => void
  onSearch: () => void
  onRandom: () => void
  loading?: boolean
}

export function NormieSearchBar({
  mode,
  onModeChange,
  query,
  onQueryChange,
  onSearch,
  onRandom,
  loading,
}: NormieSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex gap-1 rounded-lg border border-arena-border p-1">
        <ModeTab
          active={mode === 'id'}
          onClick={() => onModeChange('id')}
          icon={Search}
          label="ID"
        />
        <ModeTab
          active={mode === 'owner'}
          onClick={() => onModeChange('owner')}
          icon={Wallet}
          label="Wallet"
        />
      </div>

      <div className="relative min-w-0 flex-1">
        <Input
          placeholder={
            mode === 'id'
              ? 'Normie ID (0–9999)'
              : '0x… wallet address'
          }
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          aria-label={mode === 'id' ? 'Normie ID' : 'Wallet address'}
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="glow" onClick={onSearch} disabled={loading}>
          <Search className="h-4 w-4" />
          Search
        </Button>
        <Button type="button" variant="outline" onClick={onRandom}>
          <Dices className="h-4 w-4" />
          Random
        </Button>
      </div>
    </div>
  )
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Search
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors ${
        active
          ? 'bg-arena-glow/15 text-arena-glow'
          : 'text-arena-muted hover:text-arena-text'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
