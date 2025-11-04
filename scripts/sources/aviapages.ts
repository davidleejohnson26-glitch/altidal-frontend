// scripts/sources/aviapages.ts
// Run: npx tsx scripts/sources/aviapages.ts [--headful]

import 'dotenv/config'
import { chromium, Page, BrowserContext } from 'playwright'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { DateTime } from 'luxon'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ScrapedLeg = {
  id: string
  operator: 'aviapages'
  fromIata: string | null
  toIata: string | null
  fromIcao?: string | null
  toIcao?: string | null
  fromCity?: string | null
  toCity?: string | null
  fromName?: string | null
  toName?: string | null
  departAt: string | null
  departAtText?: string | null
  aircraft?: string | null
  acType?: string | null
  acClass?: string | null
  seats?: number | null
  priceUSD?: number | null
  url: string
  sourceMeta?: Record<string, any>
}

const BASE_URL = 'https://aviapages.com/charter_at_hand/'
const TMP_DIR = path.join(process.cwd(), 'tmp')
const HTML_PATH = path.join(TMP_DIR, 'aviapages-charter-at-hand.html')
const XHR_DIR = TMP_DIR

async function ensureTmp() { await fs.mkdir(TMP_DIR, { recursive: true }) }

function hashId(parts: (string | null | undefined)[]) {
  const h = crypto.createHash('sha1')
  h.update(parts.map(p => (p ?? '')).join('|'))
  return h.digest('hex').slice(0, 16)
}

// ---------- ICAO/IATA helpers ----------
const ICAO_TO_IATA_MAP: Record<string, string> = {
  MMSL:'CSL', MMSD:'SJD', MBPV:'PLS', TNCM:'SXM', TUPJ:'EIS', TAPB:'BBQ',
  TNCA:'AUA', MDPC:'PUJ', MYNN:'NAS', TQPF:'AXA',
  EHAM:'AMS', EGLL:'LHR', EGSS:'STN', EGGW:'LTN', EGKB:'BQH', EGCC:'MAN',
  LFPB:'LBG', LFPG:'CDG', LFMN:'NCE', LFMD:'CEQ', LSGG:'GVA', LIRA:'CIA', LIRF:'FCO',
  LIML:'LIN', LIMC:'MXP', LIPZ:'VCE', LIEO:'OLB', LEBL:'BCN', LEMD:'MAD', LEMG:'AGP',
  LEIB:'IBZ', LEPA:'PMI', LPPT:'LIS', LOWW:'VIE', EDDM:'MUC', EDDB:'BER', EIDW:'DUB',
  LCLK:'LCA', LCPH:'PFO', LROP:'OTP', LRTR:'TSR', LZIB:'BTS', LKPR:'PRG', LBSF:'SOF',
  OMDB:'DXB', OMDW:'DWC', OTHH:'DOH', HECA:'CAI', HKJK:'NBO', FAOR:'JNB', FACT:'CPT',
}

function icaoToIata(icao?: string | null): string | null {
  if (!icao) return null
  const s = icao.trim().toUpperCase()
  if (ICAO_TO_IATA_MAP[s]) return ICAO_TO_IATA_MAP[s]
  if (/^K[A-Z]{3}$/.test(s)) return s.slice(1)
  if (/^C[A-Z]{3}$/.test(s)) return s.slice(1)
  return null
}

function iataToIcao(iata?: string | null): string | null {
  if (!iata) return null
  return `K${iata.toUpperCase()}`
}

// ---------- parsing helpers ----------
function parseUSD(text?: string | null): number | null {
  if (!text) return null
  const cleaned = text.replace(/[, ]+/g, '')
  const m = cleaned.match(/\$?(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) : null
}

function parseDateToISO(text?: string | null, formatGuess?: string): { iso: string | null, raw: string | null } {
  if (!text) return { iso: null, raw: null }
  const raw = text.replace(/\s+/g, ' ').trim()
  const tryFormats = [
    ...(formatGuess ? [formatGuess] : []),
    'dd-MM-yyyy HH:mm',
    'd-MMM-yy','d-MMM-yyyy','dd-MMM-yy','dd-MMM-yyyy',
    "MMMM d, yyyy 'at' h:mm a",
    'MMMM d, yyyy','MMM d, yyyy',
    'MM/dd/yyyy h:mm a','MM/dd/yyyy',
    "yyyy-MM-dd'T'HH:mmZZ",'yyyy-MM-dd',
  ]
  for (const f of tryFormats) {
    const dt = DateTime.fromFormat(raw, f, { zone: 'utc' })
    if (dt.isValid) {
      const isDateOnly = !/H|m|s/.test(f) && !/T/.test(f)
      const norm = isDateOnly ? dt.startOf('day') : dt
      return { iso: norm.toUTC().toISO(), raw }
    }
  }
  const dt = DateTime.fromISO(raw, { zone: 'utc' })
  if (dt.isValid) return { iso: dt.toUTC().toISO(), raw }
  return { iso: null, raw }
}

function acClassFromType(t?: string | null): string | null {
  if (!t) return null
  const s = t.toUpperCase().replace(/\s+/g, ' ').trim()
  if (/\bG(V|500|550|600|650|650ER)\b/.test(s)) return 'Heavy Jet'
  if (/\bGLOBAL( 5000| 5500| 6000| 6500| 7500)?\b/.test(s)) return 'Heavy Jet'
  if (/\bFALCON (7X|8X|900)\b/.test(s)) return 'Heavy Jet'
  if (/\bCHALLENGER (600|601|604|605|650)\b/.test(s)) return 'Heavy Jet'
  if (/\bCHALLENGER (300|350)\b/.test(s)) return 'Super Midsize Jet'
  if (/\bCITATION LONGITUDE\b/.test(s)) return 'Super Midsize Jet'
  if (/\bGULFSTREAM G280\b/.test(s)) return 'Super Midsize Jet'
  if (/\bFALCON 2000(LX|EX)?\b/.test(s)) return 'Super Midsize Jet'
  if (/\bHAWKER (800|850|900|900XP)\b/.test(s)) return 'Midsize Jet'
  if (/\bCITATION (XLS\+?|SOVEREIGN|LATITUDE)\b/.test(s)) return 'Midsize Jet'
  if (/\bLEAR ?(45|60)\b/.test(s)) return 'Midsize Jet'
  if (/\bCITATION (CJ1|CJ2|CJ3|CJ4|M2|MUSTANG)\b/.test(s)) return 'Light Jet'
  if (/\bLEAR ?(31|35)\b/.test(s)) return 'Light Jet'
  if (/\bPHENOM (100|300)\b/.test(s)) return 'Light Jet'
  if (/\bKING AIR\b/.test(s)) return 'Turboprop'
  if (/\bPILATUS PC-?12\b/.test(s)) return 'Turboprop'
  if (/FALCON|CHALLENGER|GULFSTREAM|GLOBAL|LEAR|CITATION/.test(s)) return 'Midsize Jet'
  return null
}

function dedupe(rows: ScrapedLeg[]): ScrapedLeg[] {
  const map = new Map<string, ScrapedLeg>()
  for (const r of rows) {
    const k = [r.operator, r.fromIata, r.toIata, r.departAt ?? r.departAtText ?? ''].join('|')
    if (!map.has(k)) map.set(k, r)
  }
  return Array.from(map.values())
}

// ---------- XHR capture ----------
type Captured = { url: string; json?: any; textSample?: string }
function hookNetwork(page: Page) {
  const bag: Captured[] = []
  page.on('requestfinished', async (req) => {
    const url = req.url()
    if (!/aviapages\.com/i.test(url)) return
    if (!/api|search|empty|leg|legs|flight|charter|availability|graphql/i.test(url)) return
    try {
      const resp = await req.response()
      if (!resp) return
      const raw = await resp.text().catch(() => '')
      let json: any | undefined; let sample: string | undefined
      if (raw) { try { json = JSON.parse(raw) } catch { sample = raw.slice(0, 2000) } }
      bag.push({ url, json, textSample: sample })
      const fname = `aviapages-xhr-${Date.now()}-${Math.random().toString(36).slice(2,8)}.json`
      await fs.writeFile(path.join(XHR_DIR, fname), JSON.stringify({ url, body: json ?? sample ?? null }, null, 2), 'utf8')
    } catch {}
  })
  return bag
}

function parseJsonPayloads(payloads: Captured[]): ScrapedLeg[] {
  const out: ScrapedLeg[] = []
  for (const p of payloads) {
    if (!p.json) continue
    const json = p.json
    const arrays: any[] = []
    if (Array.isArray(json)) arrays.push(json)
    if (Array.isArray(json?.data)) arrays.push(json.data)
    if (Array.isArray(json?.results)) arrays.push(json.results)
    if (Array.isArray(json?.legs)) arrays.push(json.legs)

    for (const arr of arrays) {
      for (const it of arr) {
        const fromIcao = it?.from_icao || it?.from?.icao || it?.origin_icao || it?.from_apt_icao || it?.fromIcao || null
        const toIcao   = it?.to_icao   || it?.to?.icao   || it?.dest_icao  || it?.to_apt_icao   || it?.toIcao   || null
        let fromIata   = it?.from_iata || it?.from?.iata || it?.origin_iata || it?.fromIata || null
        let toIata     = it?.to_iata   || it?.to?.iata   || it?.dest_iata   || it?.toIata   || null
        if (!fromIata && fromIcao) fromIata = icaoToIata(fromIcao)
        if (!toIata && toIcao) toIata = icaoToIata(toIcao)
        if (!fromIata || !toIata) continue

        const depRaw = it?.depart_at || it?.date || it?.depart || it?.start_date || it?.etd || null
        const depIso = typeof depRaw === 'string' ? parseDateToISO(depRaw).iso : null
        const acType = it?.aircraft_type || it?.ac_type || it?.aircraft?.type || it?.type || null
        const tail   = it?.tail || it?.aircraft?.tail || it?.registration || null
        const price  = it?.price_usd || it?.price || null
        const fromCity = it?.from_city || it?.from?.city || null
        const toCity   = it?.to_city || it?.to?.city || null
        const link     = it?.url || it?.link || BASE_URL
        const acClass  = acClassFromType(acType) ?? null

        const id = hashId(['aviapages', fromIata, toIata, depIso || depRaw || acType || tail || JSON.stringify(it).slice(0, 120), String(link)])
        out.push({
          id, operator: 'aviapages',
          fromIata, toIata,
          fromIcao: fromIcao ?? (fromIata ? iataToIcao(fromIata) : null),
          toIcao: toIcao ?? (toIata ? iataToIcao(toIata) : null),
          fromCity, toCity,
          fromName: fromCity ?? fromIata ?? fromIcao ?? 'Unknown',
          toName: toCity ?? toIata ?? toIcao ?? 'Unknown',
          departAt: depIso,
          departAtText: typeof depRaw === 'string' ? depRaw : null,
          aircraft: tail ?? null,
          acType: acType ?? null,
          acClass,
          seats: null,
          priceUSD: typeof price === 'number' ? price : parseUSD(String(price ?? ''))!,
          url: String(link),
          sourceMeta: { source: 'xhr', url: p.url }
        })
      }
    }
  }
  return out
}

// ---------- Inline availability_data parsing ----------
function parseAvailabilityFromHtml(html: string): ScrapedLeg[] {
  const m = html.match(/var\s+availability_data\s*=\s*(\[\{[\s\S]*?\}\]);/)
  if (!m) return []
  let arr: any[] = []
  try { arr = JSON.parse(m[1]) } catch { return [] }

  const legs: ScrapedLeg[] = []
  for (const it of arr) {
    const fromIcao = it?.dep_airport__icao || null
    const toIcao   = it?.arr_airport__icao || null
    const fromIata = it?.dep_airport__iata || icaoToIata(fromIcao)
    const toIata   = it?.arr_airport__iata || icaoToIata(toIcao)
    if (!fromIata || !toIata) continue

    const dateFrom = it?.date_from as string | null
    const dateTo   = it?.date_to as string | null
    const dep      = parseDateToISO(dateFrom, 'dd-MM-yyyy HH:mm')
    const depText  = [dateFrom, dateTo].filter(Boolean).join(' → ') || null

    const acType  = (it?.aircraft__aircraft_type__name || it?.aircraft_type__name || null) as string | null
    const tail    = (it?.aircraft__registration_number || null) as string | null
    const price   = it?.price ?? null
    const priceUSD = typeof price === 'number' ? price : parseUSD(String(price ?? ''))
    const acClass = acClassFromType(acType) ?? null

    const fromCity = it?.dep_airport__name || null
    const toCity   = it?.arr_airport__name || null

    const id = hashId(['aviapages', fromIata, toIata, dep.iso || depText || acType || tail || JSON.stringify(it).slice(0, 120), BASE_URL])

    legs.push({
      id, operator: 'aviapages',
      fromIata, toIata,
      fromIcao: fromIcao ?? (fromIata ? iataToIcao(fromIata) : null),
      toIcao: toIcao ?? (toIata ? iataToIcao(toIata) : null),
      fromCity, toCity,
      fromName: fromCity ?? fromIata ?? fromIcao ?? 'Unknown',
      toName: toCity ?? toIata ?? toIcao ?? 'Unknown',
      departAt: dep.iso,
      departAtText: depText,
      aircraft: tail,
      acType,
      acClass,
      seats: null,
      priceUSD,
      url: BASE_URL,
      sourceMeta: { source: 'inline_availability_data' },
    })
  }
  return legs
}

function parseAvailabilityFromGlobal(globalAny: any): ScrapedLeg[] {
  if (!Array.isArray(globalAny)) return []
  return globalAny.flatMap((it: any) => {
    const fromIcao = it?.dep_airport__icao || null
    const toIcao   = it?.arr_airport__icao || null
    const fromIata = it?.dep_airport__iata || icaoToIata(fromIcao)
    const toIata   = it?.arr_airport__iata || icaoToIata(toIcao)
    if (!fromIata || !toIata) return []

    const dateFrom = it?.date_from as string | null
    const dateTo   = it?.date_to as string | null
    const dep      = parseDateToISO(dateFrom, 'dd-MM-yyyy HH:mm')
    const depText  = [dateFrom, dateTo].filter(Boolean).join(' → ') || null

    const acType  = (it?.aircraft__aircraft_type__name || it?.aircraft_type__name || null) as string | null
    const tail    = (it?.aircraft__registration_number || null) as string | null
    const price   = it?.price ?? null
    const priceUSD = typeof price === 'number' ? price : parseUSD(String(price ?? ''))
    const acClass = acClassFromType(acType) ?? null

    const fromCity = it?.dep_airport__name || null
    const toCity   = it?.arr_airport__name || null

    const id = hashId(['aviapages', fromIata, toIata, dep.iso || depText || acType || tail || JSON.stringify(it).slice(0, 120), BASE_URL])

    return [{
      id, operator: 'aviapages',
      fromIata, toIata,
      fromIcao: fromIcao ?? (fromIata ? iataToIcao(fromIata) : null),
      toIcao: toIcao ?? (toIata ? iataToIcao(toIata) : null),
      fromCity, toCity,
      fromName: fromCity ?? fromIata ?? fromIcao ?? 'Unknown',
      toName: toCity ?? toIata ?? toIcao ?? 'Unknown',
      departAt: dep.iso,
      departAtText: depText,
      aircraft: tail,
      acType,
      acClass,
      seats: null,
      priceUSD,
      url: BASE_URL,
      sourceMeta: { source: 'global_availability_data' },
    }]
  })
}

// ---------- DB helpers ----------
async function connectPrismaWithRetry(max = 5) {
  let delay = 500
  for (let i = 1; i <= max; i++) {
    try { await prisma.$connect(); return }
    catch (e) { if (i === max) throw e; await new Promise(r => setTimeout(r, delay)); delay *= 2 }
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

type LegRow = {
  id: string
  operator: string
  fromIata: string
  toIata: string
  fromIcao: string | null
  toIcao: string | null
  fromCity: string | null
  toCity: string | null
  fromName: string
  toName: string
  departAt: string | null
  acType: string | null
  acClass: string
  seats: number
  priceUSD: number
  url: string
  notes: string | null
}

/** Normalize one leg into the exact shape we write.
 *  IMPORTANT: seats defaults to 0 to satisfy NOT NULL schema.
 */
function normalizeForDb(l: ScrapedLeg): LegRow {
  const priceUsdSafe = (typeof l.priceUSD === 'number' && Number.isFinite(l.priceUSD)) ? l.priceUSD : 0 // POR
  const notesCombined = [l.departAtText, l.priceUSD == null ? 'Price on Request' : null]
    .filter(Boolean).join(' | ') || null
  const derivedClass = l.acClass ?? acClassFromType(l.acType) ?? 'Unknown'
  const seatsSafe =
    typeof l.seats === 'number' && Number.isFinite(l.seats) && l.seats >= 0
      ? Math.round(l.seats)
      : 0 // DEFAULT to 0 (schema requires Int)

  return {
    id: l.id,
    operator: 'aviapages',
    fromIata: l.fromIata!, toIata: l.toIata!,
    fromIcao: l.fromIcao ?? null, toIcao: l.toIcao ?? null,
    fromCity: l.fromCity ?? null, toCity: l.toCity ?? null,
    fromName: l.fromName ?? l.fromCity ?? l.fromIata ?? l.fromIcao ?? 'Unknown',
    toName:   l.toName   ?? l.toCity   ?? l.toIata   ?? l.toIcao   ?? 'Unknown',
    departAt: l.departAt,
    acType: l.acType ?? null,
    acClass: derivedClass, // never null
    seats: seatsSafe,      // never null
    priceUSD: priceUsdSafe,
    url: l.url,
    notes: notesCombined,
  }
}

/** Lightweight promise pool (TS-friendly) */
async function withConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<void>
) {
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
 *  1) try createMany(skipDuplicates)
 *  2) fallback to per-row upsert with concurrency + per-row dump on error
 */
async function saveToDb(rows: ScrapedLeg[], batchSize = 200) {
  if (!rows.length) return
  await connectPrismaWithRetry(5)

  // Normalize once
  const prepared = rows.map(normalizeForDb)

  // Convert departAt to Date | null for Prisma
  const preparedForCreate = prepared.map((r) => ({
    ...r,
    departAt: r.departAt ? new Date(r.departAt) : null,
  }))

  // First attempt: createMany for speed
  try {
    const created = await prisma.leg.createMany({
      data: preparedForCreate as any,
      skipDuplicates: true,
    })
    console.log(`[db] createMany inserted=${created.count}, attempted=${prepared.length} (duplicates skipped)`)
  } catch (e: any) {
    console.warn('[db] createMany failed; falling back to per-row upsert. Error:', e?.code || e?.name || e?.message || e)
  }

  // Per-row upsert (updates + inserts missed by createMany)
  const batches = chunk(prepared, batchSize)
  let total = 0, fail = 0
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
              fromIcao: r.fromIcao, toIcao: r.toIcao,
              fromCity: r.fromCity, toCity: r.toCity,
              fromName: r.fromName, toName: r.toName,
              departAt: r.departAt ? new Date(r.departAt) : null,
              acType: r.acType,
              acClass: r.acClass,
              seats: r.seats,
              priceUSD: r.priceUSD,
              url: r.url,
              notes: r.notes,
            },
            create: {
              id: r.id,
              operator: r.operator,
              fromIata: r.fromIata, toIata: r.toIata,
              fromIcao: r.fromIcao, toIcao: r.toIcao,
              fromCity: r.fromCity, toCity: r.toCity,
              fromName: r.fromName, toName: r.toName,
              departAt: r.departAt ? new Date(r.departAt) : null,
              acType: r.acType,
              acClass: r.acClass,
              seats: r.seats,
              priceUSD: r.priceUSD,
              url: r.url,
              notes: r.notes,
            },
          } as any)
          total++
        } catch (err: any) {
          fail++
          const failPath = path.join(TMP_DIR, `aviapages-row-failed-${Date.now()}-${Math.random().toString(36).slice(2,6)}.json`)
          const payload = {
            error: {
              name: err?.name,
              code: err?.code,
              message: err?.message,
              meta: err?.meta ?? null,
            },
            row: r,
          }
          await fs.writeFile(failPath, JSON.stringify(payload, null, 2), 'utf8')
          console.warn(`[db] row failed -> ${failPath}`)
        }
      })
      console.log(`[db] batch ${bi + 1}/${batches.length} ✓ upserts=${batch.length}`)
    } catch (batchErr) {
      const dumpPath = path.join(TMP_DIR, `aviapages-batch-failed-${bi + 1}-${Date.now()}.json`)
      await fs.writeFile(dumpPath, JSON.stringify({ error: String(batchErr), batch }, null, 2), 'utf8')
      console.error(`[db] batch ${bi + 1} ❌ dumped -> ${dumpPath}`)
    }
  }

  console.log(`[db] per-row upsert complete. success=${total}, failed=${fail}, total=${prepared.length}`)
}

// ---------- main ----------
async function main() {
  await ensureTmp()

  const headful = process.argv.includes('--headful')
  const browser = await chromium.launch({
    headless: !headful,
    args: ['--disable-blink-features=AutomationControlled']
  })
  let rows: ScrapedLeg[] = []

  try {
    const context: BrowserContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'en-US'
    })
    const page = await context.newPage()

    const captured = hookNetwork(page)
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })

    // 1) PRIMARY: global variable (fastest path)
    const globalAvail = await page.evaluate(() => {
      // @ts-ignore
      return (typeof (window as any).availability_data !== 'undefined')
        // @ts-ignore
        ? (window as any).availability_data
        : null
    })

    let legs: ScrapedLeg[] = []
    if (Array.isArray(globalAvail) && globalAvail.length) {
      legs = parseAvailabilityFromGlobal(globalAvail)
    } else {
      const html = await page.content()
      await fs.writeFile(HTML_PATH, html, 'utf8')

      // 2) Inline script fallback
      const viaHtml = parseAvailabilityFromHtml(html)
      legs = legs.concat(viaHtml)

      // 3) XHR fallback
      if (!viaHtml.length) {
        await page.waitForTimeout(3000)
        const viaXhr = parseJsonPayloads(captured)
        legs = legs.concat(viaXhr)
      }
    }

    // Normalize + dedupe + guarantees
    rows = dedupe(
      legs.map(l => {
        if (!l.fromIata && l.fromIcao) l.fromIata = icaoToIata(l.fromIcao)
        if (!l.toIata && l.toIcao) l.toIata = icaoToIata(l.toIcao)
        if (!l.fromIcao && l.fromIata) l.fromIcao = iataToIcao(l.fromIata)
        if (!l.toIcao && l.toIata) l.toIcao = iataToIcao(l.toIata)
        l.acClass = l.acClass ?? acClassFromType(l.acType) ?? 'Unknown'
        return l
      }).filter(l => !!l.fromIata && !!l.toIata)
    )

    const finalHtml = await page.content()
    await fs.writeFile(HTML_PATH, finalHtml, 'utf8')
    await context.close()
  } finally {
    await browser.close()
  }

  console.log(`Parsed ${rows.length} leg(s) from Aviapages`)
  for (const l of rows.slice(0, 50)) console.log(JSON.stringify(l, null, 2))
  if (rows.length > 50) console.log(`...and ${rows.length - 50} more.`)

  try {
    await saveToDb(rows, 200 /* batchSize for per-row pool */)
    console.log('Upserted rows into Prisma.Leg ✅')
  } catch {
    console.error('Upsert failed during connection phase. Rows were dumped earlier if possible.')
  } finally {
    try { await prisma.$disconnect() } catch {}
  }

  console.log(`Saved page HTML to: ${HTML_PATH}`)
  console.log(`XHR dumps (if any): ${XHR_DIR}`)
}

main().catch(async (e) => {
  console.error(e)
  try { await prisma.$disconnect() } catch {}
  process.exit(1)
})
