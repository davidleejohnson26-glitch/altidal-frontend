// app/api/health/route.ts
import { NextResponse } from 'next/server'

export function GET() {
  // basic deployment & env sanity check
  const body = {
    ok: true,
    timestamp: new Date().toISOString(),
    env: {
      node: process.version,
      vercel: !!process.env.VERCEL,
      database: !!process.env.DATABASE_URL,
    },
  }

  return NextResponse.json(body, { status: 200 })
}