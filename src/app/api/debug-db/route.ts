import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
export const runtime = 'nodejs'
export const preferredRegion = 'iad1' // US East (try 'sfo1' if you’re West Coast)

const prisma = new PrismaClient()

export async function GET() {
  try {
    // basic connectivity check
    const one = await prisma.$queryRawUnsafe('select 1 as ok')
    // small sample from Leg to confirm table access
    const count = await prisma.leg.count()
    const sample = await prisma.leg.findMany({ orderBy: { departAt: 'asc' }, take: 3 })
    return NextResponse.json({ ok: true, ping: one, count, sample })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}