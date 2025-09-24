import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/legs?from=DAL&to=TEB&start=2025-09-24&end=2025-10-01&seats=4&class=light
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from')?.toUpperCase() ?? null
  const to = url.searchParams.get('to')?.toUpperCase() ?? null
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  const seats = url.searchParams.get('seats')
  const cls = url.searchParams.get('class') // 'light' | 'midsize' | 'super-midsize' | 'heavy' | 'ultra-long'

  const where: any = {}
  if (from) where.fromIata = from
  if (to) where.toIata = to
  if (start || end) {
    where.departAt = {}
    if (start) where.departAt.gte = new Date(start)
    if (end) where.departAt.lte = new Date(end)
  }
  if (seats) where.seats = { gte: Number(seats) }
  if (cls) where.acClass = cls

  const rows = await prisma.leg.findMany({
    where,
    orderBy: { departAt: 'asc' },
    take: 200,
  })

  const legs = rows.map(r => ({
    id: r.id,
    from: { iata: r.fromIata, name: r.fromName, city: r.fromCity },
    to:   { iata: r.toIata,   name: r.toName,   city: r.toCity },
    departAt: r.departAt.toISOString(),
    priceUSD: r.priceUSD,
    aircraft: { type: r.acType, class: r.acClass as any, seats: r.seats },
    operator: r.operator,
    notes: r.notes ?? undefined,
  }))

  return NextResponse.json({ count: legs.length, legs }, { status: 200 })
}