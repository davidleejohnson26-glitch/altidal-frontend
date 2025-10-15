'use client'
import * as React from 'react'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={
          'w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm ' +
          'text-slate-100 placeholder:text-slate-500 outline-none ' +
          'focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-0 ' +
          className
        }
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export default Input