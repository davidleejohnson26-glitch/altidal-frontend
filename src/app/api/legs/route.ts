// app/api/legs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'iad1'

function json(status: number, body: any) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json(500, { ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const url = new URL(req.url)
    const p = (k: string) => url.searchParams.get(k) ?? undefined

    const from = p('from')?.toUpperCase()
    const to = p('to')?.toUpperCase()
    const operator = p('operator') as 'airpartner' | 'xo' | 'magellan' | undefined

    const start = p('start') // YYYY-MM-DD
    const end = p('end')     // YYYY-MM-DD

    const seats = p('seats') ? Number(p('seats')) : undefined
    const minPrice = p('minPrice') ? Number(p('minPrice')) : undefined
    const maxPrice = p('maxPrice') ? Number(p('maxPrice')) : undefined
    const acClass = p('class')
    const limit = Math.min(Math.max(Number(p('limit') ?? '50'), 1), 200)

    // Query Leg table (confirmed by diagnostics)
    let q = supabase
      .from('Leg')
      .select([
        'id',
        'operator',
        'fromIata', 'fromName', 'fromCity',
        'toIata',   'toName',   'toCity',
        'departAt',
        // 'arrivalAt',   // removed (column does not exist)
        'acType', 'acClass',
        'seats',
        'priceUSD',
        'url',
        'notes',
      ].join(','))
      .order('departAt', { ascending: true })
      .limit(limit)

    if (from && from.length === 3) q = q.eq('fromIata', from)
    if (to && to.length === 3)     q = q.eq('toIata', to)
    if (operator)                  q = q.eq('operator', operator)

    if (start || end) {
      if (start) q = q.gte('departAt', `${start}T00:00:00.000Z`)
      if (end)   q = q.lte('departAt', `${end}T23:59:59.999Z`)
    }

    if (Number.isFinite(minPrice)) q = q.gte('priceUSD', Number(minPrice))
    if (Number.isFinite(maxPrice)) q = q.lte('priceUSD', Number(maxPrice))

    if (Number.isFinite(seats)) {
      // include seats unknown=0
      q = q.or(`seats.gte.${seats},seats.eq.0`)
    }

    if (acClass) {
      const safe = acClass.replace(/,/g, '')
      q = q.or(`acClass.eq.${safe},acClass.eq.Unknown`)
    }

    const { data, error } = await q
    if (error) return json(500, { ok: false, error: error.message })

    const legs = (data ?? []).map((r: any) => ({
      id: r.id,
      operator: r.operator as 'airpartner' | 'xo' | 'magellan',
      from: { iata: r.fromIata, name: r.fromName, city: r.fromCity },
      to:   { iata: r.toIata,   name: r.toName,   city: r.toCity },
      departAt: r.departAt ?? null,
      // arrivalAt: r.arrivalAt ?? null, // removed
      priceUSD: r.priceUSD ?? null,
      aircraft: { type: r.acType ?? null, class: r.acClass ?? 'Unknown', seats: r.seats ?? 0 },
      url: r.url ?? null,
      notes: r.notes ?? undefined,
    }))

    return json(200, { ok: true, count: legs.length, legs })
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? 'Unknown error' })
  }
}