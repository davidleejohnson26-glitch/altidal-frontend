// app/partners/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import React from 'react'
import Header from '../header'
import Footer from '../footer'
import Button from '../ui/button'
import { prisma } from '@/lib/prisma'

type PartnerKey = 'airpartner' | 'xo' | 'magellan'

const PARTNERS: { key: PartnerKey; name: string; blurb: string; site?: string }[] = [
  { key: 'airpartner', name: 'Air Partner',    blurb: 'Global aviation services with a broad empty-leg footprint.' },
  { key: 'xo',         name: 'XO',             blurb: 'Tech-forward marketplace with frequent US/EU repositioning deals.' },
  { key: 'magellan',   name: 'Magellan Jets',  blurb: 'On-demand private aviation with competitive one-way pricing.' },
]

async function getPartnerStats() {
  const rows = await prisma.leg.groupBy({
    by: ['operator'],
    _count: { _all: true },
  })
  const counts = Object.fromEntries(rows.map(r => [r.operator, r._count._all])) as Record<string, number>
  return {
    airpartner: counts['airpartner'] ?? 0,
    xo: counts['xo'] ?? 0,
    magellan: counts['magellan'] ?? 0,
    total: rows.reduce((acc, r) => acc + r._count._all, 0),
  }
}

export default async function PartnersPage() {
  const stats = await getPartnerStats()

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100"
      >
        Skip to content
      </a>

      <Header />

      {/* Hero / intro */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.12)] ring-1 ring-inset ring-sky-500/10">
          <div className="max-w-3xl">
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">Partners</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Altidal aggregates empty-leg and flight-deal inventory from leading operators to make private aviation
              more transparent and easier to book. We currently index{' '}
              <strong className="text-slate-100">{stats.total}</strong> live legs across our partners.
            </p>
          </div>
        </div>
      </section>

      <main id="main" className="mx-auto mt-6 w-full max-w-7xl px-4 pb-12">
        {/* Partner cards */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PARTNERS.map(p => (
            <div
              key={p.key}
              className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">{p.name}</h2>
                <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-xs text-slate-200 ring-1 ring-inset ring-slate-700/60">
                  {stats[p.key]} legs
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{p.blurb}</p>

              <div className="mt-4 flex items-center gap-3">
                <a
                  href={`/api/legs?operator=${p.key}&limit=50`}
                  className="text-sm text-sky-400 underline hover:text-sky-300"
                >
                  View latest legs
                </a>
                {p.site && (
                  <>
                    <span className="text-slate-500">•</span>
                    <a
                      href={p.site}
                      target="_blank"
                      className="text-sm text-slate-300 underline hover:text-slate-200"
                    >
                      Visit site
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Why partner */}
        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">Real-time distribution</h3>
            <p className="mt-2 text-sm text-slate-300">
              Push your empty legs to a qualified audience of brokers and buyers. We refresh continually and surface your
              best deals first.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">Quality controls</h3>
            <p className="mt-2 text-sm text-slate-300">
              We normalize aircraft, pricing, and routing data, dedupe duplicates, and flag outliers for review.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">Easy integration</h3>
            <p className="mt-2 text-sm text-slate-300">
              CSV upload, JSON API, or scraper integration. Start simple—scale later.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-8 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 ring-1 ring-inset ring-sky-500/10 md:flex md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Become a partner</h3>
            <p className="mt-1 text-sm text-slate-300">
              Upload a sample CSV or connect your API. We’ll validate and list your legs quickly.
            </p>
          </div>
          <div className="mt-3 flex gap-3 md:mt-0">
            <a href="/operators">
              <Button className="bg-sky-600/90 text-white hover:bg-sky-500 ring-1 ring-inset ring-sky-400/30">
                Upload legs
              </Button>
            </a>
            <a href="mailto:hello@altidal.com">
              {/* Outline style WITHOUT a `variant` prop */}
              <Button className="border border-slate-700/70 bg-transparent text-slate-200 hover:bg-slate-800/60">
                Talk to us
              </Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />

      {/* Background grid (static) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent" />
      </div>
    </>
  )
}
