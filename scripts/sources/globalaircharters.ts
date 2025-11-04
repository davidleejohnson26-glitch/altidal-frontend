// scripts/sources/globalaircharters.ts
// Run: npx tsx scripts/sources/globalaircharters.ts
import { chromium, Page } from 'playwright'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { DateTime } from 'luxon'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type ScrapedLeg = {
  id: string
  operator: 'globalaircharters'
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

const BASE_URL = 'https://www.globalaircharters.com/empty-legs/'
const TMP_DIR = path.join(process.cwd(), 'tmp')
const HTML_PATH = path.join(TMP_DIR, 'globalaircharters-empty-legs.html')

async function ensureTmp() { await fs.mkdir(TMP_DIR, { recursive: true }) }

function hashId(parts: (string | null | undefined)[]) {
  const h = crypto.createHash('sha1')
  h.update(parts.map(p => (p ?? '')).join('|'))
  return h.digest('hex').slice(0, 16)
}

// ICAO→IATA quick map (extras beyond K*/C* heuristic)
const ICAO_TO_IATA_MAP: Record<string, string> = {
  MMSL:'CSL', MMSD:'SJD', MBPV:'PLS', EHAM:'AMS', TUPJ:'EIS', TAPB:'BBQ',
  TNCA:'AUA', MDPC:'PUJ', TAPA:'ANU', TNCM:'SXM', MYNN:'NAS', TQPF:'AXA',
  MMSP:'SLP', MMMX:'MEX', MMUN:'CUN', MMTJ:'TIJ',
  CYYZ:'YYZ', EGLL:'LHR', EGGW:'LTN', EGNX:'EMA', LFPG:'CDG', LEMD:'MAD', LIRF:'FCO',
}

function icaoToIata(icao?: string | null): string | null {
  if (!icao) return null
  const s = icao.trim().toUpperCase()
  if (ICAO_TO_IATA_MAP[s]) return ICAO_TO_IATA_MAP[s]
  if (/^K[A-Z]{3}$/.test(s)) return s.slice(1) // US
  if (/^C[A-Z]{3}$/.test(s)) return s.slice(1) // CA
  return null
}

function iataIcaoFromCell(text?: string | null): { iata: string | null, icao: string | null } {
  if (!text) return { iata: null, icao: null }
  const t = text.replace(/\s+/g, ' ').trim().toUpperCase()

  // Prefer ICAO if present
  const icaoMatch = t.match(/\b([A-Z]{4})\b/)
  if (icaoMatch) {
    const icao = icaoMatch[1]
    const iata = icaoToIata(icao)
    return { iata, icao }
  }

  // NAME (IATA)
  const parenIata = t.match(/\(([A-Z]{3})\)/)
  if (parenIata) return { iata: parenIata[1], icao: null }

  // Fallback (avoid ONE/WAY)
  const bad = new Set(['ONE', 'WAY'])
  const three = (t.match(/\b([A-Z]{3})\b/g) || []).find(code => !bad.has(code)) || null
  return { iata: three, icao: null }
}

function parseUSD(text?: string | null): number | null {
  if (!text) return null
  const m = text.replace(/[, ]+/g, '').match(/\$?(\d+(\.\d+)?)/)
  return m ? Number(m[1]) : null
}

/** Parse date formats to ISO UTC (date-only => midnight). */
function parseDateToISO(text?: string | null): { iso: string | null, raw: string | null } {
  if (!text) return { iso: null, raw: null }
  const raw = text.replace(/\s+/g, ' ').trim()
  const tryFormats = [
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
  const s = t.toUpperCase()
  if (/^G-?V$|G550|G500|G650/.test(s)) return 'Heavy Jet'
  if (/^G-?IV|G400|G450/.test(s)) return 'Heavy Jet'
  if (/^CHALLENGER|CL-?6/.test(s)) return 'Heavy Jet'
  if (/^FALCON 9|F900|F2000|F50/.test(s)) return 'Heavy Jet'
  if (/^LEAR|CITATION XLS\+?$|XLS|SOVEREIGN|LATITUDE/.test(s)) return 'Midsize Jet'
  if (/^PHENOM|PC-12|KING AIR/.test(s)) return 'Light/TP'
  return null
}

async function waitForTable(page: Page) {
  const selectors = ['table.footable','.ninja_table_wrapper table','table[id^="footable_"]']
  await page.waitForSelector(selectors.join(','), { timeout: 15000 })
}

async function setPageLengthMax(page: Page) {
  const sel = await page.$('select[name$="_length"], .dataTables_length select, .nt_rows_per_page select')
  if (sel) {
    const options: string[] = await sel.evaluate((s: HTMLSelectElement) => Array.from(s.options).map(o => o.value))
    const pick = options.includes('100') ? '100' : (options.includes('50') ? '50' : null)
    if (pick) {
      await sel.selectOption(pick)
      await page.waitForTimeout(500)
      await waitBodyChange(page)
    }
  }
}
async function getTableHandle(page: Page) {
  return page.$('table.footable, .ninja_table_wrapper table, table[id^="footable_"]')
}

/** Snapshot of the tbody to detect page changes. */
async function getTbodySignature(page: Page): Promise<string> {
  const table = await getTableHandle(page)
  if (!table) return ''
  return table.evaluate((t: HTMLTableElement) => {
    const first = t.querySelector('tbody tr')
    return (first?.textContent || '').trim().slice(0, 200)
  })
}

/** Wait for tbody text to change (helps after clicking next/length). */
async function waitBodyChange(page: Page, beforeSig?: string) {
  const prev = beforeSig ?? await getTbodySignature(page)
  await page.waitForFunction(
    (prevSig: string) => {
      const t = document.querySelector('table.footable, .ninja_table_wrapper table, table[id^="footable_"]') as HTMLTableElement | null
      const first = t?.querySelector('tbody tr')
      const now = (first?.textContent || '').trim().slice(0, 200)
      return now && now !== prevSig
    },
    prev,
    { timeout: 8000 }
  ).catch(() => {})
}

type HeaderMap = {
  startIdx?: number
  endIdx?: number
  fromCityIdx?: number
  fromIdx?: number
  toCityIdx?: number
  toIdx?: number
  acTailIdx?: number
  acTypeIdx?: number
  seatsIdx?: number
  priceIdx?: number
}
function normalizeHeader(h: string) { return h.toLowerCase().replace(/\s+/g, ' ').trim() }
function mapHeaders(headers: string[]): HeaderMap {
  const hm: HeaderMap = {}
  headers.forEach((h, i) => {
    const n = normalizeHeader(h)
    if (/^start\b.*date|^start date|^date start/.test(n)) hm.startIdx = i
    if (/^end\b.*date|^end date|^date end/.test(n)) hm.endIdx = i
    if (/departure city/.test(n)) hm.fromCityIdx = i
    if (/(from|departure\s*airport|dept\s*airport)\b/.test(n)) hm.fromIdx = i
    if (/arrival city/.test(n)) hm.toCityIdx = i
    if (/(to|destination|arrival\s*airport|arr\s*airport)\b/.test(n)) hm.toIdx = i
    if (/^aircraft$/.test(n)) hm.acTailIdx = i
    if (/aircraft type|type\b/.test(n)) hm.acTypeIdx = i
    if (/seats?/.test(n)) hm.seatsIdx = i
    if (/(price|cost)/.test(n)) hm.priceIdx = i
  })
  return hm
}

async function extractRows(page: Page): Promise<ScrapedLeg[]> {
  const tableHandle = await getTableHandle(page)
  if (!tableHandle) return []

  const headers: string[] = await tableHandle.$$eval(
    'thead th, thead td',
    (ths: Element[]) => ths.map(th => (th.textContent ?? '').trim())
  )

  const hm = mapHeaders(headers)

  const rawRows = await tableHandle.$$eval(
    'tbody tr',
    (trs: Element[]) =>
      trs
        .filter(tr => String((tr as HTMLElement).className || '').toLowerCase().indexOf('footable-detail-row') === -1)
        .map(tr => {
          const row = tr as HTMLTableRowElement
          const cells = Array.from(row.querySelectorAll('td,th')).map(cell => (cell.textContent ?? '').trim())
          const a = row.querySelector('a[href]') as HTMLAnchorElement | null
          const link = a?.href ?? ''
          return { cells, link }
        })
  )

  const legs: ScrapedLeg[] = []

  for (const { cells, link } of rawRows) {
    if (!cells.length) continue

    const startCell   = hm.startIdx     != null ? cells[hm.startIdx]     : ''
    const endCell     = hm.endIdx       != null ? cells[hm.endIdx]       : ''
    const fromCity    = hm.fromCityIdx  != null ? cells[hm.fromCityIdx]  : ''
    const toCity      = hm.toCityIdx    != null ? cells[hm.toCityIdx]    : ''
    const fromCell    = hm.fromIdx      != null ? cells[hm.fromIdx]      : ''
    const toCell      = hm.toIdx        != null ? cells[hm.toIdx]        : ''
    const acTailCell  = hm.acTailIdx    != null ? cells[hm.acTailIdx]    : ''
    const acTypeCell  = hm.acTypeIdx    != null ? cells[hm.acTypeIdx]    : ''
    const seatsCell   = hm.seatsIdx     != null ? cells[hm.seatsIdx]     : ''
    const priceCell   = hm.priceIdx     != null ? cells[hm.priceIdx]     : ''

    const fromParsed = iataIcaoFromCell(fromCell)
    const toParsed   = iataIcaoFromCell(toCell)

    const fromIata = fromParsed.iata ?? (fromParsed.icao ? icaoToIata(fromParsed.icao) : null)
    const toIata   = toParsed.iata   ?? (toParsed.icao   ? icaoToIata(toParsed.icao)   : null)
    const fromIcao = fromParsed.icao ?? (fromIata ? `K${fromIata}` : null)
    const toIcao   = toParsed.icao   ?? (toIata   ? `K${toIata}`   : null)

    const start = parseDateToISO(startCell)
    const end = parseDateToISO(endCell)
    const departIso = start.iso
    const departText = [start.raw, end.raw].filter(Boolean).join(' → ') || null

    if (!fromIata || !toIata) {
      console.warn('[skip] missing IATA after dictionary/heuristics:', { fromCell, toCell, fromIcao, toIcao, fromIata, toIata })
      continue
    }

    const url = link && /^https?:\/\//i.test(link) ? link : BASE_URL
    const acClass = acClassFromType(acTypeCell)

    const id = hashId([
      'globalaircharters',
      fromIata, toIata,
      departIso || departText || acTypeCell || acTailCell || JSON.stringify(cells).slice(0, 120),
      url,
    ])

    legs.push({
      id,
      operator: 'globalaircharters',
      fromIata,
      toIata,
      fromIcao,
      toIcao,
      fromCity: fromCity || null,
      toCity: toCity || null,
      fromName: (fromCity || fromIata || fromIcao) || null,
      toName: (toCity || toIata || toIcao) || null,
      departAt: departIso,
      departAtText: departText,
      aircraft: acTailCell || null,
      acType: acTypeCell || null,
      acClass,
      seats: seatsCell ? Number(seatsCell.replace(/\D+/g, '')) || null : null,
      priceUSD: parseUSD(priceCell),
      url,
      sourceMeta: { headers, rowSample: cells },
    })
  }

  return dedupe(legs)
}

function dedupe(rows: ScrapedLeg[]): ScrapedLeg[] {
  const map = new Map<string, ScrapedLeg>()
  for (const r of rows) {
    const k = [r.operator, r.fromIata, r.toIata, r.departAt ?? r.departAtText ?? ''].join('|')
    if (!map.has(k)) map.set(k, r)
  }
  return Array.from(map.values())
}

/** Click various "Next" or "Load More" controls. Returns true if a click changed the table. */
async function clickNextLike(page: Page): Promise<boolean> {
  const selectors = [
    '.footable-pagination .footable-page-arrow.next:not(.disabled) a',
    '.footable-pagination .footable-page-arrow.next a:not([aria-disabled="true"])',
    '.dataTables_paginate .next:not(.disabled)',
    '.paginate_button.next:not(.disabled)',
    '.nt-pagination .page-item.next:not(.disabled) a',
    '.nt-pagination a[aria-label="Next"]:not([aria-disabled="true"])',
    '.nt-pagination .pagination-next a',
    '.pagination .next:not(.disabled) a, .pagination a.next:not(.disabled)',
    'a[rel="next"]',
    'button[aria-label="Next"]:not([disabled])',
    'button.load-more:not([disabled])',
    '.nt-pagination .load-more:not([disabled])',
  ]
  const before = await getTbodySignature(page)
  for (const sel of selectors) {
    const el = await page.$(sel)
    if (el) {
      await el.click({ delay: 20 })
      await waitBodyChange(page, before)
      const after = await getTbodySignature(page)
      if (after && after !== before) return true
    }
  }
  return false
}

/** Try clicking numeric page buttons 2..N. Returns true if it navigated to a new page. */
async function clickNumericPages(page: Page, visited = new Set<string>()): Promise<boolean> {
  const numbers: number[] = await page.$$eval(
    '.footable-pagination li a, .pagination li a, .nt-pagination li a, .dataTables_paginate a',
    (els: Element[]) =>
      els
        .map(e => (e.textContent || '').trim())
        .filter(t => /^\d+$/.test(t))
        .map(t => Number(t))
  ).catch(() => [])

  if (!numbers.length) return false

  for (const n of numbers.sort((a,b)=>a-b)) {
    const key = `page-${n}`
    if (visited.has(key)) continue
    const before = await getTbodySignature(page)
    const locator = page.locator(
      '.footable-pagination li a, .pagination li a, .nt-pagination li a, .dataTables_paginate a'
    ).filter({ hasText: String(n) }).first()

    if (await locator.count() === 0) continue

    await locator.click({ delay: 20 })
    await waitBodyChange(page, before)
    const after = await getTbodySignature(page)
    if (after && after !== before) {
      visited.add(key)
      return true
    }
  }
  return false
}

/** Iterate through all pages and collect rows. */
async function extractAllPages(page: Page): Promise<ScrapedLeg[]> {
  const all: ScrapedLeg[] = []
  const seen = new Set<string>()
  const visitedNumeric = new Set<string>()

  await setPageLengthMax(page)

  // First page
  let rows = await extractRows(page)
  for (const r of rows) if (!seen.has(r.id)) { seen.add(r.id); all.push(r) }

  for (let safety = 0; safety < 100; safety++) {
    const moved = await clickNextLike(page)
    if (moved) {
      rows = await extractRows(page)
      for (const r of rows) if (!seen.has(r.id)) { seen.add(r.id); all.push(r) }
      continue
    }
    const movedNum = await clickNumericPages(page, visitedNumeric)
    if (movedNum) {
      rows = await extractRows(page)
      for (const r of rows) if (!seen.has(r.id)) { seen.add(r.id); all.push(r) }
      continue
    }
    break
  }

  return all
}

async function fetchHtmlAndRows(): Promise<{ html: string; rows: ScrapedLeg[] }> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    await waitForTable(page)

    const rows = await extractAllPages(page)
    const html = await page.content()
    return { html, rows }
  } finally {
    await browser.close()
  }
}

/** Persist to DB with Prisma (camelCase Leg model with non-null fields). */
async function saveToDb(rows: ScrapedLeg[]) {
  if (!rows.length) return

  await prisma.$transaction(
    rows.map(l => {
      const priceUsdSafe = l.priceUSD ?? 0
      const notesCombined =
        [l.departAtText, l.priceUSD == null ? 'Price on Request' : null]
          .filter(Boolean)
          .join(' | ') || null

      const departDate = l.departAt ? new Date(l.departAt) : null

      return prisma.leg.upsert({
        where: { id: l.id },
        update: {
          operator: 'globalaircharters',
          fromIata: l.fromIata!,
          toIata: l.toIata!,
          fromIcao: l.fromIcao ?? null,
          toIcao: l.toIcao ?? null,
          fromCity: l.fromCity ?? null,
          toCity: l.toCity ?? null,
          fromName: l.fromName ?? l.fromCity ?? l.fromIata ?? l.fromIcao ?? 'Unknown',
          toName:   l.toName   ?? l.toCity   ?? l.toIata   ?? l.toIcao   ?? 'Unknown',
          departAt: departDate,
          acType: l.acType ?? null,
          acClass: l.acClass ?? null,
          seats: l.seats ?? null,
          priceUSD: priceUsdSafe,
          url: l.url,
          notes: notesCombined,
        },
        create: {
          id: l.id,
          operator: 'globalaircharters',
          fromIata: l.fromIata!,
          toIata: l.toIata!,
          fromIcao: l.fromIcao ?? null,
          toIcao: l.toIcao ?? null,
          fromCity: l.fromCity ?? null,
          toCity: l.toCity ?? null,
          fromName: l.fromName ?? l.fromCity ?? l.fromIata ?? l.fromIcao ?? 'Unknown',
          toName:   l.toName   ?? l.toCity   ?? l.toIata   ?? l.toIcao   ?? 'Unknown',
          departAt: departDate,
          acType: l.acType ?? null,
          acClass: l.acClass ?? null,
          seats: l.seats ?? null,
          priceUSD: priceUsdSafe,
          url: l.url,
          notes: notesCombined,
        },
      })
    })
  )
}

async function main() {
  await ensureTmp()
  const { html, rows } = await fetchHtmlAndRows()
  await fs.writeFile(HTML_PATH, html, 'utf8')

  console.log(`Parsed ${rows.length} leg(s) from Global Air Charters`)
  for (const l of rows) console.log(JSON.stringify(l, null, 2))

  await saveToDb(rows)
  await prisma.$disconnect()

  console.log(`Saved page HTML to: ${HTML_PATH}`)
  console.log('Upserted rows into Prisma.Leg ✅')
}

main().catch(async (e) => {
  console.error(e)
  try { await prisma.$disconnect() } catch {}
  process.exit(1)
})
