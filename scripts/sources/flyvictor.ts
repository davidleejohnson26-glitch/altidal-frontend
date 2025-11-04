// scripts/sources/flyvictor.ts
// Run:
//   npx tsx scripts/sources/flyvictor.ts
//   npx tsx scripts/sources/flyvictor.ts --headful
//
// Optional env (if Fly Victor requires auth):
//   FLYVICTOR_EMAIL="you@example.com"
//   FLYVICTOR_PASSWORD="yourpassword"

import 'dotenv/config'
import { chromium, Page, BrowserContext } from 'playwright'
import fs from 'fs/promises'
import { readFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { DateTime } from 'luxon'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

console.log('[flyvictor] starting…')

// ---------- types ----------
type ScrapedLeg = {
  id: string
  operator: 'flyvictor'
  fromIata: string | null
  toIata: string | null
  departAt: string | null
  departAtText?: string | null
  acType?: string | null
  acClass?: string | null
  seats?: number | null
  priceUSD?: number | null
  url: string
  sourceMeta?: Record<string, any>
}

const BASE_URL = 'https://www.flyvictor.com/en-us/flights/'
const SITE_ORIGIN = 'https://www.flyvictor.com'
const TMP_DIR = path.join(process.cwd(), 'tmp')
const HTML_PATH = path.join(TMP_DIR, 'flyvictor-flights.html')
const XHR_DIR = TMP_DIR

async function ensureTmp() { await fs.mkdir(TMP_DIR, { recursive: true }) }

function hashId(parts: (string | null | undefined)[]) {
  const h = crypto.createHash('sha1')
  h.update(parts.map(p => (p ?? '')).join('|'))
  return h.digest('hex').slice(0, 16)
}

// ---------- Airport & City indexes ----------
type AirportIndex = { icaoToIata: Record<string, string>; iataToIcao: Record<string, string> }
type CityIndex = Record<string, { city: string; name: string; country: string }>

let AIRPORT_IDX: AirportIndex | null = null
let CITY_IDX: CityIndex | null = null

async function loadAirportIndex(): Promise<AirportIndex> {
  if (AIRPORT_IDX) return AIRPORT_IDX
  const p = path.join(process.cwd(), 'public', 'data', 'airports.index.json')
  try {
    const raw = await readFile(p, 'utf8')
    AIRPORT_IDX = JSON.parse(raw) as AirportIndex
    console.log(`[flyvictor] loaded airport index: icao→iata=${Object.keys(AIRPORT_IDX.icaoToIata).length}`)
  } catch {
    console.warn('[flyvictor] airport index missing; ICAO→IATA will be partial (US/CA + small overrides).')
    AIRPORT_IDX = { icaoToIata: {}, iataToIcao: {} }
  }
  return AIRPORT_IDX
}

async function loadCityIndex(): Promise<CityIndex> {
  if (CITY_IDX) return CITY_IDX
  const p = path.join(process.cwd(), 'public', 'data', 'airports.cities.json')
  try {
    const raw = await readFile(p, 'utf8')
    CITY_IDX = JSON.parse(raw) as CityIndex
    console.log(`[flyvictor] loaded city index: ${Object.keys(CITY_IDX).length} IATA`)
  } catch {
    console.warn('[flyvictor] city index missing; fromCity/toCity will fallback to IATA.')
    CITY_IDX = {}
  }
  return CITY_IDX
}

// Hand overrides
const ICAO_TO_IATA_OVERRIDES: Record<string, string> = {
  EGGW:'LTN', EGSS:'STN', EGLL:'LHR', EHAM:'AMS', LFPG:'CDG', LFMN:'NCE', LSGG:'GVA',
  KTEB:'TEB', KLAX:'LAX', KJFK:'JFK', KBUR:'BUR', KLAS:'LAS',
}
async function icaoToIata(icao?: string | null) {
  if (!icao) return null
  const idx = await loadAirportIndex()
  const s = icao.trim().toUpperCase()
  return idx.icaoToIata[s] || ICAO_TO_IATA_OVERRIDES[s] || (
    /^K[A-Z]{3}$/.test(s) ? s.slice(1) : /^C[A-Z]{3}$/.test(s) ? s.slice(1) : null
  )
}
async function iataToIcao(iata?: string | null) {
  if (!iata) return null
  const idx = await loadAirportIndex()
  const code = iata.trim().toUpperCase()
  return idx.iataToIcao[code] || (/^[A-Z]{3}$/.test(code) ? `K${code}` : null)
}

// ---------- parsing helpers ----------
function parseUSD(text?: string | null): number | null {
  if (!text) return null
  const m = text.replace(/\s+/g, '').match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/)
  return m ? Number(m[1].replace(/,/g, '')) : null
}

function parseDateToISO(text?: string | null, formatGuess?: string): { iso: string | null, raw: string | null } {
  if (!text) return { iso: null, raw: null }
  const raw = text.replace(/\s+/g, ' ').replace(/^Departure:\s*/i, '').trim()
  const tryFormats = [
    ...(formatGuess ? [formatGuess] : []),
    'ccc d LLL yyyy',
    'd LLL yyyy',
    'yyyy-MM-dd HH:mm',
    'dd-MM-yyyy HH:mm',
    'MM/dd/yyyy HH:mm',
    'yyyy-MM-dd',
    "yyyy-MM-dd'T'HH:mmZZ",
    'MMM d, yyyy h:mm a',
    'MMM d, yyyy',
  ]
  for (const f of tryFormats) {
    const dt = DateTime.fromFormat(raw, f, { zone: 'utc' })
    if (dt.isValid) {
      const dateOnly = !(/[Hhmst]/.test(f))
      const norm = dateOnly ? dt.startOf('day') : dt
      return { iso: norm.toUTC().toISO(), raw }
    }
  }
  const dt = DateTime.fromISO(raw, { zone: 'utc' })
  if (dt.isValid) return { iso: dt.toUTC().toISO(), raw }
  return { iso: null, raw }
}

function acClassFromType(t?: string | null): string {
  if (!t) return 'Unknown'
  const s = t.toUpperCase()
  if (/G650|G650ER|G600|G550|G500|GV\b/.test(s)) return 'Heavy Jet'
  if (/G[- ]?IV|GIV\b|G4\b/.test(s)) return 'Heavy Jet'
  if (/GLOBAL\s?(5|6|7)\d{3}/.test(s)) return 'Heavy Jet'
  if (/FALCON\s?(7X|8X|900)/.test(s)) return 'Heavy Jet'
  if (/CHALLENGER\s?(650|605|604|601)/.test(s)) return 'Heavy Jet'
  if (/CHALLENGER\s?(300|350)|FALCON\s?2000|G280|LONGITUDE/.test(s)) return 'Super Midsize Jet'
  if (/HAWKER\s?(800|850|900)|CITATION\s?(XLS\+?|SOVEREIGN|LATITUDE)|LEAR\s?(45|60)/.test(s)) return 'Midsize Jet'
  if (/CITATION\s?(CJ1|CJ2|CJ3|CJ4|M2|MUSTANG)|PHENOM\s?(100|300)|LEAR\s?(31|35)/.test(s)) return 'Light Jet'
  if (/KING\s?AIR|PC-?12/.test(s)) return 'Turboprop'
  if (/FALCON|CHALLENGER|GULFSTREAM|GLOBAL|LEAR|CITATION/.test(s)) return 'Midsize Jet'
  return 'Unknown'
}

function dedupe(rows: ScrapedLeg[]) {
  const m = new Map<string, ScrapedLeg>()
  for (const r of rows) {
    const k = [r.operator, r.fromIata, r.toIata, r.departAt ?? r.departAtText ?? ''].join('|')
    if (!m.has(k)) m.set(k, r)
  }
  return [...m.values()]
}

// ---------- network capture ----------
type Captured = { url: string; json?: any; textSample?: string }
function hookNetwork(page: Page) {
  const bag: Captured[] = []
  let kept = 0
  page.on('requestfinished', async (req) => {
    try {
      const url = req.url()
      if (!/flyvictor\.com/i.test(url)) return
      if (!/(api|graphql|search|flights|availability|offer|quote|empty-?legs)/i.test(url)) return
      const resp = await req.response()
      if (!resp) return
      const raw = await resp.text().catch(() => '')
      let json: any | undefined
      let sample: string | undefined
      if (raw) { try { json = JSON.parse(raw) } catch { sample = raw.slice(0, 2000) } }
      bag.push({ url, json, textSample: sample })
      if (kept < 15) {
        const fname = `flyvictor-xhr-${Date.now()}-${Math.random().toString(36).slice(2,8)}.json`
        await fs.writeFile(path.join(XHR_DIR, fname), JSON.stringify({ url, body: json ?? sample ?? null }, null, 2), 'utf8')
        kept++
      }
    } catch {}
  })
  return bag
}

// ---------- JSON parsing ----------
async function parseJsonPayloads(payloads: Captured[]): Promise<ScrapedLeg[]> {
  const out: ScrapedLeg[] = []
  await loadAirportIndex()

  for (const p of payloads) {
    const j = p.json
    if (!j) continue

    const arrays: any[] = []
    if (Array.isArray(j)) arrays.push(j)
    if (Array.isArray(j?.data)) arrays.push(j.data)
    if (Array.isArray(j?.results)) arrays.push(j.results)
    if (Array.isArray(j?.flights)) arrays.push(j.flights)
    if (Array.isArray(j?.offers)) arrays.push(j.offers)
    if (Array.isArray(j?.legs)) arrays.push(j.legs)

    for (const arr of arrays) {
      for (const it of arr) {
        const fromIcao = it?.origin?.icao || it?.from?.icao || it?.origin_icao || null
        const toIcao   = it?.destination?.icao || it?.to?.icao || it?.dest_icao || null
        let fromIata   = it?.origin?.iata || it?.from?.iata || it?.origin_iata || null
        let toIata     = it?.destination?.iata || it?.to?.iata || it?.dest_iata || null

        if (!fromIata && fromIcao) fromIata = await icaoToIata(fromIcao)
        if (!toIata && toIcao)     toIata   = await icaoToIata(toIcao)
        if (!fromIata || !toIata) continue

        const depRaw = it?.departureTime || it?.depart_at || it?.etd || it?.start || it?.date || it?.departure || null
        const depIso = typeof depRaw === 'string' ? parseDateToISO(depRaw).iso : null

        const acType = it?.aircraft?.typeName || it?.aircraft?.family || it?.aircraftType || it?.aircraft_model || null
        const pax    = it?.availablePax || it?.seats || null
        const price  = it?.totalPrice?.amount ?? it?.price ?? it?.price_from ?? null

        const id = hashId(['flyvictor', fromIata, toIata, depIso || depRaw || acType || JSON.stringify(it).slice(0, 120), BASE_URL])

        out.push({
          id,
          operator: 'flyvictor',
          fromIata, toIata,
          departAt: depIso,
          departAtText: typeof depRaw === 'string' ? depRaw : null,
          acType: acType ?? null,
          acClass: acClassFromType(acType) ?? 'Unknown',
          seats: pax ? Number(pax) : null,
          priceUSD: typeof price === 'number' ? price : parseUSD(String(price ?? '')),
          url: BASE_URL,
          sourceMeta: { source: 'xhr', url: p.url }
        })
      }
    }
  }
  return out
}

// ---------- DOM fallback ----------
async function parseDom(page: Page): Promise<ScrapedLeg[]> {
  await loadAirportIndex()

  const html = await page.content()
  if (html.includes('No results')) return []

  const cards = await page.$$('.result, .card, article, [data-testid*="result"], [class*="Card"], [class*="result"], [class*="EmptyLeg"], [data-testid*="empty-leg"]')
  const out: ScrapedLeg[] = []

  for (const c of cards) {
    const text = (await c.textContent())?.replace(/\s+/g, ' ').trim() || ''
    if (!text) continue

    const tokens = text.match(/\b([A-Z]{3,4})\b/g) || []
    let fromIata: string | null = null, toIata: string | null = null
    for (let i = 0; i < tokens.length - 1 && (!fromIata || !toIata); i++) {
      const a = tokens[i], b = tokens[i + 1]
      const aIata = a.length === 3 ? a : await icaoToIata(a)
      const bIata = b.length === 3 ? b : await icaoToIata(b)
      if (aIata && bIata) { fromIata = aIata; toIata = bIata; break }
    }
    if (!fromIata || !toIata) continue

    const dateTxt =
      (text.match(/Departure:\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i)?.[0]) ||
      (text.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/)?.[0]) ||
      (text.match(/\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/)?.[0]) ||
      (text.match(/\b\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?\b/)?.[0]) ||
      null
    const dep = parseDateToISO(dateTxt || '')

    const acType = (text.match(/\b(Gulfstream|Challenger|Falcon|Lear|Citation|Phenom|King Air|Pilatus|Global)\b[^,)]*/i) || [])[0] || null
    const price  = (text.match(/Price (?:starting )?from\s*\$?\s*[\d,]+(?:\.\d{2})?/i)?.[0] ||
                    text.match(/\$\s*[\d,]+(?:\.\d{2})?/)?.[0] || null)
    const pax    = (text.match(/\b(?:Capacity|Seats?)\s*:\s*(\d{1,2})/i)?.[1]) || null

    const id = hashId(['flyvictor', fromIata, toIata, dep.iso || dep.raw || acType || text.slice(0,120), BASE_URL])

    out.push({
      id,
      operator: 'flyvictor',
      fromIata, toIata,
      departAt: dep.iso, departAtText: dep.raw,
      acType,
      acClass: acClassFromType(acType) ?? 'Unknown',
      seats: pax ? Number(pax) : null,
      priceUSD: parseUSD(price),
      url: BASE_URL,
      sourceMeta: { cardTextSample: text.slice(0, 280) }
    })
  }
  return out
}

// ---------- page readiness + pagination ----------
async function waitForPageReady(page: Page, label: string) {
  const timeout = 45000
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const ok = await Promise.race([
        page.waitForSelector('[data-testid*="empty-leg"]', { state: 'attached', timeout: 3000 }),
        page.waitForSelector('nav[aria-label="pagination navigation"]', { state: 'attached', timeout: 3000 }),
        page.waitForSelector('.card, article, [class*="Card"]', { state: 'attached', timeout: 3000 }),
      ]).then(() => true).catch(() => false)
      if (ok) return
      await page.waitForTimeout(500)
    } catch {}
  }
  console.warn(`[flyvictor] waitForPageReady timed out on ${label}; continuing anyway.`)
}

async function autoScroll(page: Page) {
  try {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let total = 0
        const step = 400
        const timer = setInterval(() => {
          const { scrollHeight } = document.documentElement
          window.scrollBy(0, step)
          total += step
          if (total >= scrollHeight * 1.5) {
            clearInterval(timer)
            resolve()
          }
        }, 100)
      })
    })
  } catch {}
}

async function collectAllPaginationUrls(page: Page): Promise<string[]> {
  const urls = await page.$$eval(
    'nav[aria-label="pagination navigation"] a',
    (anchors) => anchors.map(a => (a as HTMLAnchorElement).href).filter(Boolean)
  ).catch(() => []) as string[]

  const set = new Set<string>()
  const current = page.url()
  const looksLikeFlights = (u: string) => {
    try {
      const url = new URL(u, SITE_ORIGIN)
      return /^\/en-us\/flights\/\d+\/?$/.test(url.pathname) || url.pathname === '/en-us/flights/'
    } catch { return false }
  }

  if (looksLikeFlights(current)) set.add(new URL(current).toString())
  for (const u of urls) if (u && looksLikeFlights(u)) set.add(new URL(u).toString())

  const lastNum = await page.$$eval(
    'nav[aria-label="pagination navigation"] a',
    (anchors) => {
      const nums = anchors
        .map(a => a.textContent?.trim() || '')
        .map(t => Number(t))
        .filter(n => Number.isInteger(n)) as number[]
      return nums.length ? Math.max(...nums) : null
    }
  ).catch(() => null)

  if (lastNum && lastNum > 1) {
    for (let i = 1; i <= lastNum; i++) set.add(`${SITE_ORIGIN}/en-us/flights/${i}/`)
  }

  return Array.from(set).sort((a, b) => {
    const na = Number(a.match(/\/flights\/(\d+)\//)?.[1] || (a.endsWith('/flights/') ? '1' : '1'))
    const nb = Number(b.match(/\/flights\/(\d+)\//)?.[1] || (b.endsWith('/flights/') ? '1' : '1'))
    return na - nb
  })
}

async function scrapeAllPages(context: BrowserContext): Promise<{ legs: ScrapedLeg[]; captured: Captured[] }> {
  const page = await context.newPage()
  const captured = hookNetwork(page)

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForPageReady(page, 'page 1')
  await autoScroll(page)

  let allUrls = await collectAllPaginationUrls(page)
  if (!allUrls.length) allUrls = [page.url()]

  // Blind probing if pagination nav not reliable
  const discovered = new Set(allUrls)
  if (discovered.size === 1) {
    let emptyStreak = 0
    for (let i = 2; i <= 200; i++) {
      const u = `${SITE_ORIGIN}/en-us/flights/${i}/`
      try {
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 })
        await waitForPageReady(page, `page ${i}`)
        await autoScroll(page)

        const hasCards = await page.$('[data-testid*="empty-leg"], .card, article, [class*="Card"]').then(Boolean).catch(() => false)
        if (!hasCards) {
          emptyStreak++
          if (emptyStreak >= 2) break
        } else {
          emptyStreak = 0
          discovered.add(u)
        }
      } catch {
        emptyStreak++
        if (emptyStreak >= 2) break
      }
    }
  }

  const sortedUrls = Array.from(discovered).sort((a, b) => {
    const na = Number(a.match(/\/flights\/(\d+)\//)?.[1] || (a.endsWith('/flights/') ? '1' : '1'))
    const nb = Number(b.match(/\/flights\/(\d+)\//)?.[1] || (b.endsWith('/flights/') ? '1' : '1'))
    return na - nb
  })

  const allDomLegs: ScrapedLeg[] = []

  for (let i = 0; i < sortedUrls.length; i++) {
    const u = sortedUrls[i]
    if (!(i === 0 && page.url() === u)) {
      await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await waitForPageReady(page, `page ${i+1}`)
      await autoScroll(page)
    }

    const domLegs = await parseDom(page)
    allDomLegs.push(...domLegs)

    try {
      const pnum = u.match(/\/flights\/(\d+)\//)?.[1] || (i + 1).toString()
      await fs.writeFile(path.join(TMP_DIR, `flyvictor-flights-page-${pnum}.html`), await page.content(), 'utf8')
    } catch {}
  }

  await page.close().catch(() => {})
  return { legs: allDomLegs, captured }
}

// ---------- small helpers ----------
function chunk<T>(arr: T[], size: number) {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function connectPrismaWithRetry(max = 5) {
  let delay = 500
  for (let i = 1; i <= max; i++) {
    try { await prisma.$connect(); return }
    catch (e) { if (i === max) throw e; await new Promise(r => setTimeout(r, delay)); delay *= 2 }
  }
}

// ---- DB payload (match your Prisma model) ----
type LegRow = {
  id: string
  fromIata: string
  fromName: string
  fromCity: string
  toIata: string
  toName: string
  toCity: string
  departAt: string // ISO
  priceUSD: number
  acType: string
  acClass: string
  seats: number
  operator: string
  notes?: string | null
  fromIcao?: string | null
  toIcao?: string | null
  url?: string | null
}

function safeInt(n?: number | null): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0
  return Math.round(n)
}

async function normalizeForDb(l: ScrapedLeg): Promise<LegRow> {
  const cityIdx = await loadCityIndex()
  const portIdx = await loadAirportIndex()

  const fromIata = (l.fromIata || '').toUpperCase()
  const toIata = (l.toIata || '').toUpperCase()

  const fromName = fromIata || 'UNK'
  const toName = toIata || 'UNK'

  const fromCity = cityIdx[fromIata]?.city || cityIdx[fromIata]?.name || fromIata || 'UNK'
  const toCity   = cityIdx[toIata]?.city   || cityIdx[toIata]?.name   || toIata   || 'UNK'

  const departAtISO =
    l.departAt ||
    DateTime.utc().startOf('day').toISO()! // required by schema

  const priceUSD = safeInt(l.priceUSD)
  const acType = (l.acType || 'Unknown').trim() || 'Unknown'
  const acClass = (l.acClass || acClassFromType(l.acType) || 'Unknown').trim() || 'Unknown'
  const seats = safeInt(l.seats)

  const fromIcao = portIdx.iataToIcao[fromIata] || (fromIata ? `K${fromIata}` : null)
  const toIcao   = portIdx.iataToIcao[toIata]   || (toIata ? `K${toIata}`   : null)

  const notesParts = [
    l.departAtText ? `raw:${l.departAtText}` : null,
    l.priceUSD == null ? 'POR' : null,
    l.acType && !acClassFromType(l.acType) ? `type:${l.acType}` : null,
  ].filter(Boolean)

  return {
    id: l.id,
    operator: 'flyvictor',
    fromIata,
    fromName,
    fromCity,
    toIata,
    toName,
    toCity,
    departAt: departAtISO,
    priceUSD,
    acType,
    acClass,
    seats,
    fromIcao,
    toIcao,
    url: l.url || BASE_URL,
    notes: notesParts.length ? notesParts.join(' | ') : null,
  }
}

// TS-safe lightweight promise pool (fixes implicit 'any' on runNext)
async function withConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<void>
): Promise<void> {
  let i = 0
  const running: Promise<void>[] = []

  const runNext = (): Promise<void> => {
    if (i >= items.length) return Promise.resolve()

    const idx = i++
    const p = worker(items[idx], idx).finally(() => {
      const pos = running.indexOf(p)
      if (pos >= 0) running.splice(pos, 1)
    })
    running.push(p)

    if (running.length >= limit) {
      return Promise.race(running).then(() => runNext())
    }
    return Promise.resolve().then(() => runNext())
  }

  await runNext()
  await Promise.all(running)
}

/** Persist rows:
 *  1) createMany(skipDuplicates)
 *  2) per-row upsert to update existing ones
 */
async function saveToDb(rows: ScrapedLeg[], batchSize = 200) {
  if (!rows.length) return
  await connectPrismaWithRetry(5)

  const prepared: LegRow[] = []
  for (const r of rows) {
    if (r.fromIata && r.toIata) prepared.push(await normalizeForDb(r))
  }

  try {
    const created = await prisma.leg.createMany({ data: prepared as any, skipDuplicates: true })
    console.log(`[db] createMany inserted=${created.count} attempted=${prepared.length}`)
  } catch (e: any) {
    console.warn('[db] createMany failed; continuing with upserts. Reason:', e?.code || e?.name || e?.message)
  }

  const batches = chunk(prepared, batchSize)
  let ok = 0, fail = 0
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    try {
      await withConcurrency(batch, 6, async (r) => {
        try {
          await prisma.leg.upsert({
            where: { id: r.id },
            update: {
              operator: r.operator,
              fromIata: r.fromIata, toIata: r.toIata,
              fromName: r.fromName, toName: r.toName,
              fromCity: r.fromCity, toCity: r.toCity,
              departAt: new Date(r.departAt),
              priceUSD: r.priceUSD,
              acType: r.acType,
              acClass: r.acClass,
              seats: r.seats,
              fromIcao: r.fromIcao,
              toIcao: r.toIcao,
              url: r.url,
              notes: r.notes ?? null,
            },
            create: {
              id: r.id,
              operator: r.operator,
              fromIata: r.fromIata, toIata: r.toIata,
              fromName: r.fromName, toName: r.toName,
              fromCity: r.fromCity, toCity: r.toCity,
              departAt: new Date(r.departAt),
              priceUSD: r.priceUSD,
              acType: r.acType,
              acClass: r.acClass,
              seats: r.seats,
              fromIcao: r.fromIcao ?? null,
              toIcao: r.toIcao ?? null,
              url: r.url ?? null,
              notes: r.notes ?? null,
            },
          } as any)
          ok++
        } catch (err: any) {
          fail++
          console.warn(`[db] upsert fail id=${r.id}:`, err?.code, err?.message)
          const failPath = path.join(TMP_DIR, `flyvictor-row-failed-${Date.now()}-${Math.random().toString(36).slice(2,6)}.json`)
          await fs.writeFile(failPath, JSON.stringify({ error: {
            name: err?.name, code: err?.code, message: err?.message, meta: err?.meta ?? null,
          }, row: r }, null, 2), 'utf8')
          console.warn(`[db] row failed -> ${failPath}`)
        }
      })
      console.log(`[db] batch ${bi + 1}/${batches.length} ✓ upserts=${batch.length}`)
    } catch (batchErr) {
      const dump = path.join(TMP_DIR, `flyvictor-batch-failed-${bi + 1}-${Date.now()}.json`)
      await fs.writeFile(dump, JSON.stringify({ error: String(batchErr), batch }, null, 2), 'utf8')
      console.error(`[db] batch ${bi + 1} ❌ dumped -> ${dump}`)
    }
  }
  console.log(`[db] per-row upsert complete. success=${ok} failed=${fail} total=${prepared.length}`)
}

// ---------- optional: login ----------
async function maybeLogin(context: BrowserContext) {
  const email = process.env.FLYVICTOR_EMAIL
  const pass  = process.env.FLYVICTOR_PASSWORD
  if (!email || !pass) return

  const page = await context.newPage()
  try {
    await page.goto('https://www.flyvictor.com/en-us/login', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.fill('input[type="email"], input[name*="email"]', email)
    await page.fill('input[type="password"], input[name*="password"]', pass)
    await page.click('button:has-text("Sign in"), button[type="submit"]')
    await waitForPageReady(page, 'post-login')
    await context.storageState({ path: path.join(TMP_DIR, 'flyvictor-storage.json') })
  } catch (e) {
    console.warn('[auth] login not completed; continuing unauthenticated.')
  } finally {
    await page.close().catch(()=>{})
  }
}

// ---------- exportable scraper ----------
export async function scrapeFlyVictor(): Promise<ScrapedLeg[]> {
  await ensureTmp()
  await loadAirportIndex()
  await loadCityIndex()

  const headful = process.argv.includes('--headful')
  const browser = await chromium.launch({
    headless: !headful,
    args: ['--disable-blink-features=AutomationControlled']
  })

  let rows: ScrapedLeg[] = []

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'en-US'
    })

    // await maybeLogin(context)

    // Crawl every page and capture XHR
    const { legs: domLegs, captured } = await scrapeAllPages(context)

    // Prefer JSON, then merge DOM
    const jsonLegs = await parseJsonPayloads(captured)
    let legs = [...jsonLegs, ...domLegs]

    rows = dedupe(
      legs.map(l => {
        l.acClass = l.acClass ?? acClassFromType(l.acType) ?? 'Unknown'
        l.seats = typeof l.seats === 'number' ? l.seats : 0
        l.url = BASE_URL
        return l
      }).filter(l => !!l.fromIata && !!l.toIata)
    )

    // Save a final html snapshot for page 1 (optional)
    try {
      const page1 = await context.newPage()
      await page1.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await fs.writeFile(HTML_PATH, await page1.content(), 'utf8')
      await page1.close().catch(()=>{})
    } catch {}

    await context.close()
  } finally {
    await browser.close()
  }

  return rows
}

// ---------- CLI entry (only when run directly) ----------
async function main() {
  const rows = await scrapeFlyVictor()
  console.log(`Parsed ${rows.length} leg(s) from Fly Victor`)
  for (const l of rows.slice(0, 40)) console.log(JSON.stringify(l, null, 2))
  if (rows.length > 40) console.log(`...and ${rows.length - 40} more.`)

  try {
    await saveToDb(rows, 200)
    console.log('Upserted rows into Prisma.Leg ✅')
  } catch (e: any) {
    console.error('Upsert failed during connection. Any per-row errors were dumped to tmp/.')
    console.error('[saveToDb error]', e?.name || '', e?.code || '', e?.message || e)
  } finally {
    try { await prisma.$disconnect() } catch {}
  }

  console.log(`Saved page HTML to: ${HTML_PATH}`)
  console.log(`XHR dumps (if any): ${XHR_DIR}`)
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/scripts/sources/flyvictor.ts')) {
  main().catch(async (e) => {
    console.error(e)
    try { await prisma.$disconnect() } catch {}
    process.exit(1)
  })
}
