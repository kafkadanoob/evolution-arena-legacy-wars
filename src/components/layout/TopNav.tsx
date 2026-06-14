import { NavLink } from 'react-router-dom'
import { Swords } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Home' },
  { to: '/arena', label: 'Arena' },
  { to: '/battle', label: 'Battle' },
  { to: '/normies', label: 'Normies' },
  { to: '/legacy', label: 'Legacy' },
]

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 hidden border-b border-arena-border bg-arena-bg/95 backdrop-blur md:block">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <NavLink to="/" className="flex items-center gap-2 font-pixel text-[10px] text-arena-glow">
          <Swords className="h-4 w-4" aria-hidden />
          <span>Evolution Arena</span>
        </NavLink>
        <nav className="flex gap-1" aria-label="Main">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'rounded px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'text-arena-glow'
                    : 'text-arena-muted hover:text-arena-text',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
