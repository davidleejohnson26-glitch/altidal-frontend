
'use client'
import { Plane, Bell } from 'lucide-react'
import { Chip, Button } from '@/components/ui'
import { motion } from 'framer-motion'

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
    <Plane className="h-5 w-5" />
  </div>
</motion.div>
          <div className="text-lg font-semibold tracking-tight">Altidal</div>
          <Chip className="ml-2">MVP</Chip>
        </div>
    <nav className="hidden items-center gap-6 md:flex">
  <a className="text-sm text-slate-600 hover:text-slate-900 transition" href="#how">How it works</a>
  <a className="text-sm text-slate-600 hover:text-slate-900 transition" href="#operators">For Operators</a>
  <Button variant="outline">
    <Bell className="h-4 w-4" /> Get alerts
  </Button>
</nav>
      </div>
    </header>
  )
}
