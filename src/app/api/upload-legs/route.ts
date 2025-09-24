// src/app/api/upload-legs/route.ts
import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import type { Leg } from '@/lib/leg-types'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

// Normalize aircraft class to our enum
function normClass(input: string): Leg['aircraft']['class'] | null {
  const s = (input || '').toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
  const map: Record<string, Leg['aircraft']['class']> = {
    'light': 'light',
    'midsize': 'midsize',
    'super-midsize': 'super-midsize',
    'super-midsize-jet': 'super-midsize',
    'heavy': 'heavy',
    'ultra-long': 'ultra-long',
    'ultra-long-range': 'ultra-long',
    'ultra': 'ultra-long',
  }
  return map[s] ?? null
}

// Convert one CSV row -> Leg
function rowToLeg(r: any): Leg | null {
  const get = (k: string) => r[k] ?? r[k.toUpperCase()] ?? r[k.toLowerCase()]
  const cls = normClass(get('aircraft_class') || '')
  const departAt = get('departAt') || get('depart_at')

  if (!get('id') || !get('from_iata') || !get('to_iata') || !departAt || !get('priceUSD') || !cls) {
    return null
  }

  return {
    id: String(get('id')),
    from: {
      iata: String(get('from_iata')).toUpperCase(),
      name: String(get('from_name') ?? get('from_iata')).trim(),
      city: String(get('from_city') ?? '').trim() || String(get('from_name') ?? '').trim(),
    },
    to: {
      iata: String(get('to_iata')).toUpperCase(),
      name: String(get('to_name') ?? get('to_iata')).trim(),
      city: String(get('to_city') ?? '').trim() || String(get('to_name') ?? '').trim(),
    },
    departAt: new Date(get('departAt') || get('depart_at')).toISOString(),
    priceUSD: Number(get('priceUSD')),
    aircraft: {
      type: String(get('aircraft_type') ?? 'Unknown').trim(),
      class: cls,
      seats: Number(get('seats') ?? 0),
    },
    operator: String(get('operator') ?? 'Partner').trim(),
    notes: get('notes') ? String(get('notes')).trim() : undefined,
  }
}

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded. Use field name "file".' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  let records: any[]
  try {
    records = parse(buf, { columns: true, skip_empty_lines: true, bom: true, trim: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'CSV parse failed', detail: e?.message }, { status: 400 })
  }

  const legs: Leg[] = []
  const rejects: number[] = []

  records.forEach((r, i) => {
    const leg = rowToLeg(r)
    if (leg) legs.push(leg)
    else rejects.push(i + 2) // +2: header row + 1-index
  })

  // Build rows to insert
  const rows = legs.map(l => ({
    id: l.id,
    fromIata: l.from.iata,
    fromName: l.from.name,
    fromCity: l.from.city,
    toIata: l.to.iata,
    toName: l.to.name,
    toCity: l.to.city,
    departAt: new Date(l.departAt),
    priceUSD: Math.round(l.priceUSD),
    acType: l.aircraft.type,
    acClass: l.aircraft.class,
    seats: l.aircraft.seats,
    operator: l.operator,
    notes: l.notes ?? null,
  }))

  // Upsert in a loop (simple for MVP)
  let added = 0
  for (const row of rows) {
    try {
      await prisma.leg.create({ data: row })
      added++
    } catch {
      // duplicate id -> ignore
    }
  }

  return NextResponse.json({ added, rejectedRows: rejects, totalParsed: records.length })
}