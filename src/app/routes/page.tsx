// app/routes/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from 'react'
import dynamicImport from 'next/dynamic'
import { prisma } from '@/lib/prisma'

type LegDTO = {
  id: string
  operator: 'airpartner' | 'xo' | 'magellan'
  fromIata: string | null
  toIata: string | null
  departAt: string | null
  priceUSD: number | null
}

const RoutesMap = dynamicImport(() => import('@/components/RoutesMap'), { ssr: false })

async function getLegs(): Promise<LegDTO[]> {
  const legs = await prisma.leg.findMany({
    select: {
      id: true,
      operator: true,
      fromIata: true,
      toIata: true,
      departAt: true,
      priceUSD: true,
    },
    // If fromIata/toIata are NOT NULLABLE in your schema, filter by non-empty string:
    where: {
      AND: [
        { fromIata: { not: '' } },
        { toIata:   { not: '' } },
      ],
      // Optionally restrict to recent/future:
      // departAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
    },
    orderBy: { departAt: 'desc' },
    take: 1000,
  })

  return legs.map((l) => ({
    id: l.id,
    operator: l.operator as LegDTO['operator'],
    fromIata: l.fromIata,
    toIata: l.toIata,
    departAt:
      l.departAt
        ? (l.departAt instanceof Date ? l.departAt.toISOString() : String(l.departAt))
        : null,
    priceUSD: l.priceUSD,
  }))
}

export default async function RoutesPage() {
  const legs = await getLegs()

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Routes</h1>
        <p className="text-slate-600">
          Loaded <strong>{legs.length}</strong> legs from the database. We draw lines where both IATA codes resolve to coordinates.
        </p>

        <div className="h-[70vh] w-full overflow-hidden rounded-2xl border">
          <Suspense fallback={<div className="p-4 text-sm text-slate-600">Loading map…</div>}>
            <RoutesMap legs={legs} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}