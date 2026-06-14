import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arena-glow disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-arena-text text-arena-bg hover:bg-arena-glow hover:text-arena-bg',
        outline:
          'border border-arena-border bg-transparent hover:border-arena-glow hover:text-arena-glow',
        ghost: 'hover:bg-arena-border/50 hover:text-arena-glow',
        glow: 'border border-arena-glow/50 bg-arena-glow/10 text-arena-glow shadow-[0_0_20px_rgba(0,255,159,0.15)] hover:bg-arena-glow/20',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
