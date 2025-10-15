'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import type { MotionProps } from 'framer-motion'
import { Bell, Globe, Home, Menu, Plane, X } from 'lucide-react'

type MDivProps = React.HTMLAttributes<HTMLDivElement> & MotionProps

export default function Header() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  const openAlerts = () => window.dispatchEvent(new CustomEvent('open-alerts'))

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <Link href="/" className="flex items-center gap-1 text-sm text-slate-300 transition hover:text-white" onClick={onClick}>
        <Home className="h-4 w-4" aria-hidden="true" /> Home
      </Link>
      <Link href="/operators" className="text-sm text-slate-300 transition hover:text-white" onClick={onClick}>Operators</Link>
      <Link href="/routes" className="text-sm text-slate-300 transition hover:text-white" onClick={onClick}>Routes</Link>
      <Link href="/empty-legs" className="text-sm text-slate-300 transition hover:text-white" onClick={onClick}>Empty Legs</Link>
      <Link href="/partners" className="text-sm text-slate-300 transition hover:text-white" onClick={onClick}>Partners</Link>
      <Link href="/api" className="text-sm text-slate-300 transition hover:text-white" onClick={onClick}>API</Link>
      <Link href="/about" className="text-sm text-slate-300 transition hover:text-white" onClick={onClick}>About</Link>
    </>
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600/90 text-white ring-1 ring-inset ring-sky-400/30">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </div>
          </motion.div>
          <div className="text-lg font-semibold tracking-tight text-slate-100">Altidal</div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <NavLinks />
          <button
            onClick={openAlerts}
            className="inline-flex items-center gap-2 rounded-md bg-sky-600/90 px-3 py-2 text-sm text-white ring-1 ring-inset ring-sky-400/30 hover:bg-sky-500"
          >
            <Bell className="h-4 w-4" aria-hidden="true" /> Get alerts
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile overlay + panel */}
      <AnimatePresence>
        {open ? (
          <>
            {/* Overlay (typed cast fixes className complaint) */}
            <motion.div
              {...({
                className: 'fixed inset-0 z-40 bg-black/50',
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0 },
                onClick: () => setOpen(false),
              } as MDivProps)}
            />
            {/* Drawer (cast as well to be consistent) */}
            <motion.div
              {...({
                id: 'mobile-nav',
                role: 'dialog',
                'aria-modal': true,
                className:
                  'fixed inset-y-0 right-0 z-50 w-80 max-w-[85%] border-l border-slate-800 bg-slate-950 shadow-xl md:hidden',
                initial: { x: '100%' },
                animate: { x: 0 },
                exit: { x: '100%' },
                transition: { type: 'tween', duration: 0.22 },
              } as MDivProps)}
            >
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600/90 text-white ring-1 ring-inset ring-sky-400/30">
                    <Plane className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="font-semibold text-slate-100">Altidal</span>
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-col gap-4 px-4 py-5">
                <NavLinks onClick={() => setOpen(false)} />
                <button
                  onClick={() => {
                    openAlerts()
                    setOpen(false)
                  }}
                  className="mt-2 w-full rounded-md bg-sky-600/90 px-3 py-2 text-sm text-white ring-1 ring-inset ring-sky-400/30 hover:bg-sky-500"
                >
                  <Bell className="mr-2 inline-block h-4 w-4" aria-hidden="true" /> Get alerts
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
