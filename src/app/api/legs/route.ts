// app/api/legs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Prisma requires Node runtime on Vercel
export const runtime = 'nodejs'

// GET /api/legs?from=DAL&to=TEB&start=2025-09-24&end=2025-10-01&seats=4&class=light
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const from = url.searchParams.get('from')?.toUpperCase() ?? null
    const to = url.searchParams.get('to')?.toUpperCase() ?? null
    const start = url.searchParams.get('start') || null // YYYY-MM-DD
    const end = url.searchParams.get('end') || null     // YYYY-MM-DD
    const seatsParam = url.searchParams.get('seats')
    const cls = url.searchParams.get('class') // 'light' | 'midsize' | 'super-midsize' | 'heavy' | 'ultra-long'

    const where: any = { AND: [] as any[] }

    if (from) where.AND.push({ fromIata: from })
    if (to) where.AND.push({ toIata: to })

    if (start || end) {
      const departAt: any = {}
      if (start) departAt.gte = new Date(`${start}T00:00:00Z`)
      if (end) departAt.lte = new Date(`${end}T23:59:59.999Z`)
      where.AND.push({ departAt })
    }

    // Treat seats=0 in DB as "unknown". If user asks for seats >= N, include unknown (0) so results are not empty by default.
    const nSeats = seatsParam ? Number(seatsParam) : NaN
    if (!Number.isNaN(nSeats)) {
      where.AND.push({ OR: [{ seats: { gte: nSeats } }, { seats: 0 }] })
    }

    // Many rows may have acClass = 'Unknown'. If class filter is provided, also include 'Unknown' so users see something.
    if (cls) {
      where.AND.push({ OR: [{ acClass: cls }, { acClass: 'Unknown' }] })
    }

    const rows = await prisma.leg.findMany({
      where: where.AND.length ? where : undefined,
      orderBy: { departAt: 'asc' },
      take: 200,
    })

    const legs = rows.map((r) => ({
      id: r.id,
      from: { iata: r.fromIata, name: r.fromName, city: r.fromCity },
      to: { iata: r.toIata, name: r.toName, city: r.toCity },
      departAt: r.departAt.toISOString(),
      priceUSD: r.priceUSD,
      aircraft: { type: r.acType, class: r.acClass, seats: r.seats },
      operator: r.operator,
      notes: r.notes ?? undefined,
    }))

    return NextResponse.json({ count: legs.length, legs }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}