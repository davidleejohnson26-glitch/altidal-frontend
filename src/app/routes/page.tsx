// app/routes/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import { prisma } from '@/lib/prisma'

// ⬇️ Use DEFAULT imports to match your files' default exports
import Header from '../header'
import Footer from '../footer'

type LegDTO = {
  id: string
  operator: 'airpartner' | 'xo' | 'magellan'
  fromIata: string | null
  toIata: string | null
  departAt: string | null
  priceUSD: number | null
}

// If your RoutesMap moved too, update this path to wherever it actually lives
const RoutesMap = dynamicImport(() => import('@/components/RoutesMap'), { ssr: false })

async function getLegs(): Promise<LegDTO[]> {
  const legs = await prisma.leg.findMany({
    select: { id: true, operator: true, fromIata: true, toIata: true, departAt: true, priceUSD: true },
    where: { AND: [{ fromIata: { not: '' } }, { toIata: { not: '' } }] },
    orderBy: { departAt: 'desc' },
    take: 1000,
  })

  return legs.map((l) => ({
    id: l.id,
    operator: l.operator as LegDTO['operator'],
    fromIata: l.fromIata,
    toIata: l.toIata,
    departAt: l.departAt ? (l.departAt instanceof Date ? l.departAt.toISOString() : String(l.departAt)) : null,
    priceUSD: l.priceUSD,
  }))
}

export default async function RoutesPage() {
  const legs = await getLegs()

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100"
      >
        Skip to content
      </a>

      <Header />

      {/* Intro / hero */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.12)] ring-1 ring-inset ring-sky-500/10">
          <h1 className="text-xl font-semibold tracking-tight text-slate-100">Routes</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Loaded <strong className="text-slate-100">{legs.length}</strong> legs from the database. We draw lines where
            both IATA codes resolve to coordinates.
          </p>
        </div>
      </section>

      {/* Map */}
      <main id="main" className="mx-auto mt-6 w-full max-w-7xl px-4 pb-12">
        <div className="h-[70vh] w-full overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
          <Suspense fallback={<div className="p-4 text-sm text-slate-300">Loading map…</div>}>
            <RoutesMap legs={legs} />
          </Suspense>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Tip: zoom and pan to explore clusters; hover/tap route lines for details (where supported).
        </p>
      </main>

      <Footer />

      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent" />
      </div>
    </>
  )
}