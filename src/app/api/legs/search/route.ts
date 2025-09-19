
import { NextResponse } from 'next/server'
import { MOCK_LEGS } from '@/lib/mock'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const frm = searchParams.get('from')
  const to = searchParams.get('to')
  const seats = Number(searchParams.get('seats') || '0')
  const cls = searchParams.get('classPref')

  const filtered = MOCK_LEGS.filter((l: any) => {
    const okFrom = frm ? l.from.iata === frm : true
    const okTo = to ? l.to.iata === to : true
    const okSeats = seats ? (l.aircraft?.seats || 0) >= seats : true
    const okCls = cls && cls !== 'any' ? l.aircraft.class === cls : true
    return okFrom && okTo && okSeats && okCls
  })

  return NextResponse.json({ results: filtered })
}
