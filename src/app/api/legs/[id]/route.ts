
import { NextResponse } from 'next/server'
import { MOCK_LEGS } from '@/lib/mock'

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const id = decodeURIComponent(params.id)
  const leg = MOCK_LEGS.find(l => l.id === id)
  if (!leg) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(leg)
}
