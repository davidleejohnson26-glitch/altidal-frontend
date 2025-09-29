import { NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function GET() {
  const mask = (s?: string) => s?.replace(/\/\/.*?:.*?@/, '//***:***@')
  return NextResponse.json({
    DATABASE_URL: mask(process.env.DATABASE_URL),
    DIRECT_URL: mask(process.env.DIRECT_URL),
  })
}