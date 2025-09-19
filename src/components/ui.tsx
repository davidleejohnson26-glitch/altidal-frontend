
import { cn } from '@/lib/utils'
import { PropsWithChildren } from 'react'

export const Button = ({ className, children, variant = 'default', ...props }: any) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400'
  const styles: Record<string,string> = {
    default: 'bg-sky-600 text-white hover:bg-sky-700',
    outline: 'border border-slate-300 hover:bg-slate-50',
    ghost: 'hover:bg-slate-100',
  }
  const Cmp: any = 'button'
  return <Cmp className={cn(base, styles[variant], className)} {...props}>{children}</Cmp>
}

export const Card = ({ className, children }: PropsWithChildren<{className?:string}>) => (
  <div className={cn('rounded-2xl bg-white shadow-sm ring-1 ring-slate-200', className)}>{children}</div>
)
export const Input = (props: any) => (
  <input {...props} className={cn('w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100', props.className)} />
)
export const Select = (props: any) => (
  <select {...props} className={cn('w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100', props.className)} />
)
export const Chip = ({ children, className }: PropsWithChildren<{className?:string}>) => (
  <span className={cn('inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600', className)}>{children}</span>
)
