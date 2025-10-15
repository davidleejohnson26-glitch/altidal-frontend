'use client'
import * as React from 'react'

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={
          'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium ' +
          'text-white bg-sky-600/90 hover:bg-sky-500 ring-1 ring-inset ring-sky-400/30 ' +
          'disabled:opacity-50 disabled:pointer-events-none ' +
          className
        }
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export default Button