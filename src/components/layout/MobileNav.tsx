import { NavLink } from 'react-router-dom'
import { Home, LayoutGrid, Swords, Users, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/arena', label: 'Arena', icon: LayoutGrid },
  { to: '/battle', label: 'Battle', icon: Swords },
  { to: '/normies', label: 'Normies', icon: Users },
  { to: '/legacy', label: 'Legacy', icon: Trophy },
]

export function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-arena-border bg-arena-bg/95 backdrop-blur md:hidden"
      aria-label="Mobile"
    >
      <ul className="flex justify-around py-2">
        {links.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 text-[10px]',
                  isActive ? 'text-arena-glow' : 'text-arena-muted',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
