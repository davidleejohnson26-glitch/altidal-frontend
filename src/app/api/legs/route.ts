import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const preferredRegion = 'iad1'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const from = url.searchParams.get('from')?.toUpperCase() ?? undefined
  const to   = url.searchParams.get('to')?.toUpperCase() ?? undefined
  const start = url.searchParams.get('start') || undefined // YYYY-MM-DD
  const end   = url.searchParams.get('end') || undefined
  const seats = url.searchParams.get('seats')
  const cls   = url.searchParams.get('class') // 'light' | 'midsize' | ...

  let q = supabase.from('Leg').select('*').order('departAt', { ascending: true }).limit(200)

  if (from) q = q.eq('fromIata', from)
  if (to)   q = q.eq('toIata', to)
  if (start || end) {
    if (start) q = q.gte('departAt', `${start}T00:00:00Z`)
    if (end)   q = q.lte('departAt', `${end}T23:59:59.999Z`)
  }
  if (seats) q = q.or(`seats.gte.${Number(seats)},seats.eq.0`) // include unknown=0
  if (cls)   q = q.or(`acClass.eq.${cls},acClass.eq.Unknown`)  // include Unknown

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const legs = (data ?? []).map((r: any) => ({
    id: r.id,
    from: { iata: r.fromIata, name: r.fromName, city: r.fromCity },
    to:   { iata: r.toIata,   name: r.toName,   city: r.toCity },
    departAt: r.departAt,
    priceUSD: r.priceUSD,
    aircraft: { type: r.acType, class: r.acClass, seats: r.seats },
    operator: r.operator,
    notes: r.notes ?? undefined,
  }))

  return NextResponse.json({ count: legs.length, legs })
}