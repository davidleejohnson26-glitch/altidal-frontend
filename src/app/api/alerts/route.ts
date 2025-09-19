
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  // TODO: persist and wire to email alerts
  console.log('Alert created', body)
  return NextResponse.json({ ok: true })
}
