'use client'
import { useState, useEffect } from 'react'
import { Plane, Bell, Menu, X, Home } from 'lucide-react'
import { Chip, Button } from '@/components/ui'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

// ✅ Minimal TS fix: alias with relaxed typing for motion.div
const MotionDiv = motion.div as unknown as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & { initial?: any; animate?: any; exit?: any; transition?: any }
>

export function Header() {
  const [open, setOpen] = useState(false)

  // Close menu on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Prevent background scroll when menu is open
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition"
        onClick={onClick}
      >
        <Home className="h-4 w-4" /> Home
      </Link>
      <Link
        href="/operators"
        className="text-sm text-slate-600 hover:text-slate-900 transition"
        onClick={onClick}
      >
        Operators
      </Link>
      <Link
        href="/routes"
        className="text-sm text-slate-600 hover:text-slate-900 transition"
        onClick={onClick}
      >
        Routes
      </Link>
      <Link
        href="/empty-legs"
        className="text-sm text-slate-600 hover:text-slate-900 transition"
        onClick={onClick}
      >
        Empty Legs
      </Link>
      <Link
        href="/partners"
        className="text-sm text-slate-600 hover:text-slate-900 transition"
        onClick={onClick}
      >
        Partners
      </Link>
      <Link
        href="/api"
        className="text-sm text-slate-600 hover:text-slate-900 transition"
        onClick={onClick}
      >
        API
      </Link>
      <Link
        href="/about"
        className="text-sm text-slate-600 hover:text-slate-900 transition"
        onClick={onClick}
      >
        About
      </Link>
    </>
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Plane className="h-5 w-5" />
            </div>
          </motion.div>
          <div className="text-lg font-semibold tracking-tight">Altidal</div>
          <Chip className="ml-2">MVP</Chip>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <NavLinks />
          <Button variant="outline">
            <Bell className="h-4 w-4" /> Get alerts
          </Button>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile overlay + panel */}
      <AnimatePresence>
        {open && (
          <>
            <MotionDiv
              className="fixed inset-0 z-40 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <MotionDiv
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85%] border-l border-slate-200 bg-white shadow-xl md:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
                    <Plane className="h-5 w-5" />
                  </div>
                  <span className="font-semibold">Altidal</span>
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex flex-col gap-4 px-4 py-5">
                <NavLinks onClick={() => setOpen(false)} />
                <Button variant="outline" className="mt-2 w-full" onClick={() => setOpen(false)}>
                  <Bell className="h-4 w-4" /> Get alerts
                </Button>
              </div>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}