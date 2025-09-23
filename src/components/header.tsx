'use client'
import Image from 'next/image'
import { Bell } from 'lucide-react'
import { Chip, Button } from '@/components/ui'
import { motion } from 'framer-motion'

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Left: Logo + MVP chip */}
        <div className="flex items-center gap-3">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
            <Image
              src="/logo/svg/logo-primary.svg"   // make sure this exists in public/logo/svg/
              alt="Altidal"
              width={160}
              height={48}
              priority
            />
          </motion.div>
          <Chip className="ml-1">MVP</Chip>
        </div>

        {/* Right: Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <a className="text-sm text-slate-600 transition hover:text-slate-900" href="#how">
            How it works
          </a>
          <a className="text-sm text-slate-600 transition hover:text-slate-900" href="#operators">
            For Operators
          </a>
          <Button variant="outline">
            <Bell className="h-4 w-4" />
            Get alerts
          </Button>
        </nav>
      </div>
    </header>
  )
}