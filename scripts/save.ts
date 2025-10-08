// scripts/save.ts
import 'dotenv/config'
import { PrismaClient /* , Prisma */ } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.PRISMA_LOG === '1' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
})

// ---------- TYPES ----------

type InLeg = {
  id: string
  operator: 'Magellan' | 'Airpartner' | 'xo' | string
  origin?: string
  destination?: string
  fromIata?: string
  toIata?: string
  departureUtc?: string
  arrivalUtc?: string
  aircraft?: string
  price?: number
  url: string               // kept for logs/debug only (NOT persisted)
}

const ICAO_RE = /^[A-Z]{4}$/
const IATA_RE = /^[A-Z]{3}$/
const DRY_RUN = process.env.DRY_RUN === '1'
const DEPART_FALLBACK = process.env.DEPART_FALLBACK || 'now' // now | today | fixed:2026-01-01T00:00:00Z
const SEATS_FALLBACK = Number.isFinite(Number(process.env.SEATS_FALLBACK))
  ? Number(process.env.SEATS_FALLBACK)
  : 1  // was 0 → default to 1 so UI doesn't hide legs

// DOM noise / marketing words
const STOP_WORDS = new Set([
  'SIZE','FULL','LIKE','FLY','DATA','EIO','ONE','WAY','MENU','NAV','HOME',
  'MORE','NEXT','BACK','PAGE','CARD','READ','POST','BLOG','INFO',
  'TOP','TIER','OPT','OUT','RESERVE','VIEW','DETAILS','NOW',
  'DAY','DAYS','OCT','CITY','CITIES'
])

// ---------- HELPERS ----------

function normalizeOperator(op: string) {
  const k = (op || '').trim().toLowerCase()
  if (k === 'xo' || k === 'flyxo' || k === 'fly xo') return 'xo'
  if (k === 'airpartner' || k === 'air partner') return 'Airpartner'
  if (k === 'magellan') return 'Magellan'
  return op
}

function isGoodCode(s?: string) {
  if (!s) return false
  const up = s.toUpperCase()
  if (STOP_WORDS.has(up)) return false
  if (IATA_RE.test(up)) return true
  if (ICAO_RE.test(up)) return true
  return false
}

function parseDateFlexible(s?: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d
  const n = Number(s)
  if (Number.isFinite(n)) {
    const ms = n > 1e12 ? n : n * 1000
    const d2 = new Date(ms)
    if (!Number.isNaN(d2.getTime())) return d2
  }
  const cleaned = s.replace(/\b(UTC|GMT)\b/gi, '').trim()
  const d3 = new Date(cleaned)
  return Number.isNaN(d3.getTime()) ? undefined : d3
}

function getFallbackDepartAt(): Date {
  if (DEPART_FALLBACK === 'today') {
    const now = new Date()
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  }
  if (DEPART_FALLBACK.startsWith('fixed:')) {
    const iso = DEPART_FALLBACK.slice('fixed:'.length)
    const d = new Date(iso)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function cleanPrice(n?: number): number | undefined {
  if (typeof n !== 'number') return undefined
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.round(n)
}

function looksLikeJunkId(id: string) {
  const junk = ['main-navigation','header','footer','menu','nav','card','js-slider','slider']
  return junk.some(j => id.toLowerCase().includes(j))
}

function icaoToIataGuess(icao: string) {
  if (!icao || icao.length !== 4) return undefined
  return icao.startsWith('K') ? icao.slice(1) : icao.slice(-3)
}

function deriveAirportColumns(origin: string, destination: string) {
  const out: Partial<Sanitized> = {}
  if (IATA_RE.test(origin)) out.fromIata = origin
  if (ICAO_RE.test(origin)) { out.fromIcao = origin; out.fromIata = icaoToIataGuess(origin) || origin.slice(-3) }
  if (IATA_RE.test(destination)) out.toIata = destination
  if (ICAO_RE.test(destination)) { out.toIcao = destination; out.toIata = icaoToIataGuess(destination) || destination.slice(-3) }
  return out
}

function makeDisplayFields(origin: string, destination: string, fromIata?: string, toIata?: string) {
  const normName = (code: string, iata?: string) =>
    iata || (code.length === 4 && code.startsWith('K') ? code.slice(1) : code)
  const fromName = normName(origin, fromIata)
  const toName   = normName(destination, toIata)
  const fromCity = fromName
  const toCity   = toName
  return { fromName, toName, fromCity, toCity }
}

function resolveRouteFields(x: InLeg): { origin?: string; destination?: string } {
  if (x.origin && x.destination) return { origin: x.origin, destination: x.destination }
  if (x.fromIata && x.toIata)    return { origin: x.fromIata, destination: x.toIata }
  return { origin: x.origin, destination: x.destination }
}

// ---------- SANITIZED TYPE ----------

type Sanitized = {
  id: string
  operator: string
  origin: string
  destination: string
  fromIata: string
  toIata: string
  fromIcao?: string
  toIcao?: string
  fromName: string
  toName: string
  fromCity: string
  toCity: string
  departAt?: Date
  priceUSD?: number
  acType?: string
  acClass?: string
  seats?: number
  url: string
  notes: string | null
}

// ---------- SANITIZER ----------

function sanitizeLeg(x: InLeg): { ok: true; value: Sanitized } | { ok: false; reason: string } {
  const id = String(x.id || '').trim()
  if (!id) return { ok: false, reason: 'missing id' }
  if (looksLikeJunkId(id)) return { ok: false, reason: `junk id (${id})` }

  const { origin: o0, destination: d0 } = resolveRouteFields(x)
  const origin = o0?.toUpperCase().trim()
  const destination = d0?.toUpperCase().trim()
  if (!isGoodCode(origin)) return { ok: false, reason: `bad origin (${o0})` }
  if (!isGoodCode(destination)) return { ok: false, reason: `bad destination (${d0})` }
  if (origin === destination) return { ok: false, reason: `same origin/destination (${origin})` }

  const departAt = parseDateFlexible(x.departureUtc)
  const priceUSD = cleanPrice(x.price)

  const derived = deriveAirportColumns(origin!, destination!)
  const fromIata = derived.fromIata || (IATA_RE.test(origin!) ? origin! : icaoToIataGuess(origin!) || origin!.slice(-3))
  const toIata   = derived.toIata   || (IATA_RE.test(destination!) ? destination! : icaoToIataGuess(destination!) || destination!.slice(-3))

  const { fromName, toName, fromCity, toCity } = makeDisplayFields(origin!, destination!, fromIata, toIata)

  return {
    ok: true,
    value: {
      id,
      operator: normalizeOperator(x.operator), // <-- normalize here
      origin: origin!,
      destination: destination!,
      fromIata,
      toIata,
      fromIcao: derived.fromIcao,
      toIcao: derived.toIcao,
      fromName,
      toName,
      fromCity,
      toCity,
      ...(departAt ? { departAt } : {}),
      ...(priceUSD ? { priceUSD } : {}),
      acType: x.aircraft || undefined,
      acClass: undefined,
      seats: undefined,
      url: x.url,
      notes: null,
    }
  }
}

// ---------- PRISMA HELPERS ----------

function isUniqueViolation(err: unknown): boolean {
  return Boolean(
    err && typeof err === 'object' &&
    (err as any).code === 'P2002' &&
    Array.isArray((err as any).meta?.target) &&
    ((err as any).meta.target as string[]).includes('id')
  )
}

let _loggedDepartFallback = false
let _loggedPriceFallback = false
let _loggedSeatsFallback = false
function logDepartFallbackOnce() {
  if (_loggedDepartFallback) return
  _loggedDepartFallback = true
  console.log(`saveLegs: applying departAt fallback (${DEPART_FALLBACK}) where missing.`)
}
function logPriceFallbackOnce() {
  if (_loggedPriceFallback) return
  _loggedPriceFallback = true
  console.log(`saveLegs: applying price fallback → priceUSD=0 & notes+="Contact for Price" where missing.`)
}
function logSeatsFallbackOnce() {
  if (_loggedSeatsFallback) return
  _loggedSeatsFallback = true
  console.log(`saveLegs: applying seats fallback → seats=${SEATS_FALLBACK} where missing.`)
}

// ---------- MAIN SAVE ----------

export async function saveLegs(legs: InLeg[]) {
  const start = Date.now()
  let added = 0, updated = 0, skipped = 0
  const skipReasons: Array<{ id?: string; reason: string }> = []
  const errors: Array<{ id?: string; error: string }> = []

  if (!Array.isArray(legs) || legs.length === 0) {
    console.log('saveLegs: nothing to save.')
    return { added, updated, skipped, errors }
  }

  const sample = legs.slice(0, 3).map(l => ({
    id: l.id, operator: l.operator, origin: l.origin ?? l.fromIata, destination: l.destination ?? l.toIata, url: l.url,
  }))
  console.log(`saveLegs: incoming=${legs.length}. Sample:`, JSON.stringify(sample, null, 2))

  for (const raw of legs) {
    const s = sanitizeLeg(raw)
    if (!s.ok) {
      skipped++
      if (skipReasons.length < 10) skipReasons.push({ id: raw?.id, reason: s.reason })
      continue
    }
    const v = s.value

    const createData: any = {
      id: v.id,
      operator: v.operator,
      notes: v.notes,
      fromIata: v.fromIata,
      toIata: v.toIata,
      fromName: v.fromName,
      toName: v.toName,
      fromCity: v.fromCity,
      toCity: v.toCity,
      departAt: v.departAt ?? (() => { logDepartFallbackOnce(); return getFallbackDepartAt() })(),
      priceUSD: typeof v.priceUSD === 'number' ? v.priceUSD : (() => { logPriceFallbackOnce(); return 0 })(),
      acType: v.acType || 'Unknown',
      acClass: v.acClass || 'Unknown',
      seats: typeof v.seats === 'number' ? v.seats : (() => { logSeatsFallbackOnce(); return SEATS_FALLBACK })(),
    }

    if (typeof v.priceUSD !== 'number') {
      createData.notes = (createData.notes ? `${createData.notes}\n` : '') + 'Contact for Price'
    }

    if (DRY_RUN) { updated++; continue }

    try {
      await prisma.leg.create({ data: createData })
      added++
    } catch (e: any) {
      if (isUniqueViolation(e)) {
        try {
          const { id, ...updateData } = createData
          await prisma.leg.update({ where: { id: v.id }, data: updateData })
          updated++
        } catch (e2: any) {
          errors.push({ id: v.id, error: e2?.message || String(e2) })
        }
      } else {
        errors.push({ id: v.id, error: e?.message || String(e) })
      }
    }
  }

  const ms = Date.now() - start
  console.log(`saveLegs: done in ${ms}ms → added=${added}, updated=${updated}, skipped=${skipped}, errors=${errors.length}`)
  if (skipReasons.length) console.log('saveLegs: skip reasons:', JSON.stringify(skipReasons, null, 2))
  if (errors.length) console.log('saveLegs: sample errors (up to 5):', JSON.stringify(errors.slice(0, 5), null, 2))

  return { added, updated, skipped, errors }
}

// ---------- ENTRYPOINT (optional direct run) ----------

if (require.main === module) {
  (async () => {
    const { scrapeMagellan } = await import('./sources/magellan')
    const legs = await scrapeMagellan()
    const res = await saveLegs(legs)
    console.log('Saved summary:', res)
    await prisma.$disconnect()
  })().catch(async (e) => {
    console.error('save.ts failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
}