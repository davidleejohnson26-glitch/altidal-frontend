
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  // TODO: send email / forward to operator
  console.log('Lead received', body)
  return NextResponse.json({ ok: true, partner_ref: 'mock-123' })
}
