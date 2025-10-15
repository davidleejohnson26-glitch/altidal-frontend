'use client'

import React from 'react'
import { Mail, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-800/60 bg-slate-950/70">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="text-lg font-semibold tracking-tight text-slate-100">Altidal</div>
          <p className="mt-2 text-sm text-slate-400">Where empty legs find altitude.</p>
        </div>
        <div>
          <div className="text-sm font-medium text-slate-200">Legal</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-400">
            <li>Altidal is not an air carrier. We connect travelers with Part 135 operators and licensed brokers.</li>
            <li><a href="/privacy" className="text-slate-300 hover:text-slate-100 hover:underline">Privacy</a></li>
            <li><a href="/terms" className="text-slate-300 hover:text-slate-100 hover:underline">Terms</a></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium text-slate-200">Contact</div>
          <ul className="mt-2 space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@altidal.com</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +1 (555) 555-0199</li>
          </ul>
        </div>
      </div>
    </footer>
  )
}