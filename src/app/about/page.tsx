// src/app/about/page.tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Info, Target, Users, Mail } from 'lucide-react'

// ✅ Default imports (your header/footer export default)
import Header from '../header'
import Footer from '../footer'

export default function AboutPage() {
  // Avoid strict TS complaints for decorative background animation
  const MotionDiv = motion.div as any

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100"
      >
        Skip to content
      </a>

      <Header />

      {/* Hero / info banner */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.12)] ring-1 ring-inset ring-sky-500/10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">About Altidal</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Altidal aggregates <strong className="font-semibold text-slate-100">empty-leg</strong> and{' '}
                <strong className="font-semibold text-slate-100">flight-deal</strong> listings from leading private jet
                operators into one real-time view. Our goal is to make business aviation inventory transparent,
                searchable, and accessible to brokers and travelers alike.
              </p>
            </div>
            <div className="flex items-center justify-center md:justify-end">
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">What you get</div>
                <div className="mt-1 space-y-1">
                  <div>• Real-time legs</div>
                  <div>• Clean, fast UI</div>
                  <div>• Operator-friendly tools</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content cards */}
      <main id="main" className="mx-auto mt-6 max-w-5xl px-4 pb-12">
        <div className="grid gap-6">
          {/* How it works */}
          <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-sky-400" />
              <h2 className="text-lg font-semibold text-slate-100">How It Works</h2>
            </div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
              <li>Scrapers collect data from multiple operators and APIs.</li>
              <li>Legs are normalized into a unified format and saved via Prisma.</li>
              <li>The frontend lets users search, filter, and view deals instantly.</li>
            </ul>
          </section>

          {/* Who we work with */}
          <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-400" />
              <h2 className="text-lg font-semibold text-slate-100">Who We Work With</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              We currently aggregate data from Air Partner, XO, and Magellan Jets — with more operators coming soon. Our
              aim is to support the entire charter ecosystem.
            </p>
          </section>

          {/* Mission / focus */}
          <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-sky-400" />
              <h2 className="text-lg font-semibold text-slate-100">Our Focus</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Speed, clarity, and accuracy. We prioritize a frictionless experience for operators and travelers, while
              keeping the data model simple and extensible.
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-400" />
              <h2 className="text-lg font-semibold text-slate-100">Contact</h2>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              For partnership inquiries, API access, or media requests, reach us at{' '}
              <a href="mailto:hello@altidal.com" className="text-sky-400 underline underline-offset-2 hover:text-sky-300">
                hello@altidal.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <Footer />

      {/* Background grid + sweep */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <MotionDiv
          className="absolute inset-x-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent"
          initial={{ y: -100 }}
          animate={{ y: [-100, 1200] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        />
      </div>
    </>
  )
}
