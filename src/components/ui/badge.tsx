import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'glow' | 'muted' | 'danger'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide',
        variant === 'default' && 'border border-arena-border text-arena-text',
        variant === 'glow' && 'border border-arena-glow/40 bg-arena-glow/10 text-arena-glow',
        variant === 'muted' && 'bg-arena-border/30 text-arena-muted',
        variant === 'danger' && 'border border-arena-danger/40 text-arena-danger',
        className,
      )}
    >
      {children}
    </span>
  )
}
