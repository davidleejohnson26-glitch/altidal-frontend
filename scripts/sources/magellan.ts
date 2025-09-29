// scripts/sources/magellan.ts — Playwright version (popup-proof + text-sweep + iframe-aware)
export const MAGELLAN_VERSION = 'popup-proof-textsweep-iframe-2025-09-27'
console.log('[magellan] using', MAGELLAN_VERSION)

import { chromium, type Page, type Frame, type BrowserContext } from 'playwright'
import fs from 'fs/promises'

type Leg = {
  id: string
  operator: 'magellan'
  origin: string
  destination: string
  departureUtc?: string
  arrivalUtc?: string
  aircraft?: string
  price?: number
  url: string
}

// ---------- validators / helpers ----------
const STOPWORDS = new Set([
  'DATA','LIKE','SIZE','FULL','MORE','READ','NEXT','BACK','HOME','INFO','LEARN','FROM','TO','WITH',
  'THIS','PAGE','JOIN','CALL','TEXT','TEST','HERO','CARD','NAV','MENU','MAIN','ONE','WAY',
  'TOP','TIER','OPT','OUT','RESERVE','VIEW','DETAILS','NOW','BOOK','DISCOVER'
])
const norm = (s: string) => s.trim().toUpperCase()
const isLikelyAirportCode = (s?: string) => {
  if (!s) return false
  const t = norm(s)
  // accept IATA (3) or ICAO (4), all letters
  if (!/^[A-Za-z]{3,4}$/.test(t)) return false
  if (STOPWORDS.has(t)) return false
  return true
}

async function acceptAndNukePopups(page: Page | Frame) {
  try { await page.locator('.cmplz-cookiebanner .cmplz-accept').click({ timeout: 3000 }) } catch {}
  const closers = [
    '[aria-label="Close"]',
    '.leadinModal-close, .leadinModal-close-leadin, .leadinModal .close',
    '.modal-close, .modal__close, .modal-close-button',
    '#leadinModal .close',
    '.ub-emb-close, .ub-close',
    '.pum-close, .pum-overlay'
  ]
  for (const sel of closers) {
    try {
      const btns = page.locator(sel)
      const n = await btns.count()
      for (let i = 0; i < n; i++) await btns.nth(i).click({ timeout: 400 }).catch(() => {})
    } catch {}
  }
  // visually hide common popup shells just in case
  try {
    // @ts-ignore
    await (page as any).addStyleTag?.({ content: `
      #leadinModal, .leadinModal, .pum-overlay, .pum-container,
      .hs-form-modal, .modal, .popup, .ub-emb-container {
        display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;
      }
    `})
  } catch {}
}

async function clickLoadMoreUntilDone(page: Page | Frame) {
  const tryOnce = async () => {
    const candidates = page.locator('button, a')
      .filter({ hasText: /discover more|load more|view more|show more|see more|reserve now|view details|load all/i })
    const count = await candidates.count().catch(() => 0)
    if (!count) return false
    for (let i = 0; i < count; i++) {
      try {
        await candidates.nth(i).click({ timeout: 2000 })
        // give the page a chance to fetch & render
        await (page as Page).waitForLoadState?.('networkidle', { timeout: 5000 }).catch(() => {})
        await new Promise(r => setTimeout(r, 700))
        return true
      } catch {}
    }
    return false
  }
  for (let i = 0; i < 10; i++) {
    const clicked = await tryOnce()
    if (!clicked) break
  }
}

function tryParseNetworkJson(obj: any): Leg[] | null {
  if (!obj || typeof obj !== 'object') return null
  const arr = Array.isArray(obj) ? obj : Array.isArray(obj?.data) ? obj.data : null
  if (!arr || !arr.length) return null

  const looksLikeLeg = (x: any) =>
    typeof x === 'object' &&
    (x.origin || x.from || x.departure || x.departure_airport || x.from_airport) &&
    (x.destination || x.to || x.arrival || x.arrival_airport || x.to_airport)

  if (!arr.some(looksLikeLeg)) return null

  const out: Leg[] = []
  for (const x of arr) {
    const from = x.origin ?? x.from ?? x.departure_airport ?? x.from_airport ?? x.departure?.airport
    const to   = x.destination ?? x.to ?? x.arrival_airport   ?? x.to_airport   ?? x.arrival?.airport
    if (!from || !to) continue
    const o = norm(String(from)), d = norm(String(to))
    if (!isLikelyAirportCode(o) || !isLikelyAirportCode(d)) continue

    const dep =
      x.departureUtc ?? x.departure_time_utc ?? x.departure_time ?? x.departure?.utc ??
      x.departure_datetime ?? x.start_time ?? null
    const arrUtc =
      x.arrivalUtc ?? x.arrival_time_utc ?? x.arrival_time ?? x.arrival?.utc ?? x.end_time ?? null

    const aircraft = x.aircraft_type ?? x.aircraft ?? x.tail ?? x.fleet ?? undefined
    const price = typeof x.price === 'number' ? x.price : undefined
    const id = String(x.id ?? x.uid ?? [o, d, dep ?? x.date ?? x.valid_from ?? Date.now()].filter(Boolean).join('_'))

    out.push({
      id: `magellan_${id}`,
      operator: 'magellan',
      origin: o,
      destination: d,
      departureUtc: dep ? String(dep) : undefined,
      arrivalUtc: arrUtc ? String(arrUtc) : undefined,
      aircraft: aircraft ? String(aircraft) : undefined,
      price,
      url: 'https://magellanjets.com/private-jet-services/empty-legs/',
    })
  }
  return out.length ? out : null
}

async function scrapeViaNetwork(page: Page): Promise<Leg[]> {
  const candidates: Leg[] = []
  page.on('response', async (resp) => {
    try {
      const url = resp.url()
      if (!/magellanjets\.com|wp-json|admin-ajax|api|empty|leg|legs|flight|inventory/i.test(url)) return
      const ctype = resp.headers()['content-type'] || ''
      if (!/json|javascript|ld\+json/i.test(ctype)) return
      const json = await resp.json().catch(() => null)
      const legs = tryParseNetworkJson(json)
      if (legs) candidates.push(...legs)
    } catch {}
  })
  await page.goto('https://magellanjets.com/private-jet-services/empty-legs/', { waitUntil: 'domcontentloaded' })
  await acceptAndNukePopups(page)
  await clickLoadMoreUntilDone(page)
  // let late XHRs settle
  await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {})
  await page.waitForTimeout(1000)
  return candidates
}

// ---------- DOM scraper (cards + robust text sweep) ----------
async function extractFromFrame(frame: Page | Frame): Promise<Leg[]> {
  await acceptAndNukePopups(frame)
  await clickLoadMoreUntilDone(frame)

  // Pass 1: per-card extraction
  let legs: Leg[] = await frame.evaluate(() => {
    // @ts-ignore
    ;(globalThis as any).__name = (fn: any) => fn
    const text = (el: Element | null | undefined) => (el?.textContent || '').replace(/\s+/g, ' ').trim()

    const STOPWORDS = new Set([
      'DATA','LIKE','SIZE','FULL','MORE','READ','NEXT','BACK','HOME','INFO','LEARN','FROM','TO','WITH',
      'THIS','PAGE','JOIN','CALL','TEXT','TEST','HERO','CARD','NAV','MENU','MAIN','ONE','WAY',
      'TOP','TIER','OPT','OUT','RESERVE','VIEW','DETAILS','NOW','BOOK','DISCOVER'
    ])
    const isCode = (s?: string) => {
      if (!s) return false
      const t = s.trim().toUpperCase()
      if (!/^[A-Za-z]{3,4}$/.test(t)) return false
      if (STOPWORDS.has(t)) return false
      return true
    }
    const up = (s: string) => s.trim().toUpperCase()

    const candidates = Array.from(document.querySelectorAll(
      [
        'article', 'li', '.card', '.row > div',
        '.et_pb_module', '.wp-block-group', '.wp-block-columns > .wp-block-column',
        '.et_pb_column .et_pb_text', '.et_pb_column .et_pb_blurb',
        '[data-el], [data-flight], [data-origin], [data-destination]'
      ].join(', ')
    )).filter(el => {
      const t = text(el)
      return /empty\s*leg|reserve\s*now|view\s*details|\$\s*\d|origin|destination/i.test(t)
    })

    const results: any[] = []
    for (const el of candidates) {
      const t = text(el)

      // Try explicit data-attrs first
      const dataset: any = (el as HTMLElement).dataset || {}
      let o: string | null = dataset.origin || dataset.from || null
      let d: string | null = dataset.destination || dataset.to || null
      if (o && d) { o = up(o); d = up(d) }

      // (ABC) to (DEF)
      if (!o || !d) {
        const paren = t.match(/\(([A-Za-z]{3,4})\)\s*(?:→|to|-|–|—)\s*\(([A-Za-z]{3,4})\)/i)
        if (paren) { o = up(paren[1]); d = up(paren[2]) }
      }

      // ABC … to … DEF  (allow some text between)
      if (!o || !d) {
        const arrow = t.match(/\b([A-Za-z]{3,4})\b[^A-Za-z]{0,60}?(?:→|to|-|–|—)[^A-Za-z]{0,60}?\b([A-Za-z]{3,4})\b/i)
        if (arrow) { o = up(arrow[1]); d = up(arrow[2]) }
      }

      if (!o || !d) continue
      if (!isCode(o) || !isCode(d)) continue

      const date =
        t.match(/\b(20\d{2}[-/\.]\d{1,2}[-/\.]\d{1,2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?Z?)?)\b/)?.[1] ||
        t.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*20\d{2})?\b/i)?.[0] ||
        null

      const aircraft =
        text(el.querySelector('[class*="aircraft"], [data-aircraft], .tail, .type, .jet, .aircraft-type')) || undefined

      const priceTxt = text(el.querySelector('[class*="price"], [data-price], .fare, .cost, .amount, .el-price')) || ''
      const price = (() => {
        const m = priceTxt.replace(/[^\d]/g, '').match(/(\d{3,})/)
        return m ? Number(m[1]) : undefined
      })()

      const rawId =
        el.getAttribute('data-id') ||
        (el.querySelector('[id]') as HTMLElement | null)?.id ||
        `${o}-${d}-${date || ''}-${results.length}`

      results.push({
        id: `magellan_${rawId}`,
        operator: 'magellan',
        origin: o,
        destination: d,
        departureUtc: date || undefined,
        aircraft,
        price,
        url: location.href,
      })
    }

    return results
  }) as Leg[]

  // Pass 2: whole-frame TEXT SWEEP if nothing card-like found
  if (!legs.length) {
    const sweep = await frame.evaluate(() => {
      const bodyText = document.body?.innerText?.replace(/\s+/g, ' ') || ''
      const STOPWORDS = new Set([
        'DATA','LIKE','SIZE','FULL','MORE','READ','NEXT','BACK','HOME','INFO','LEARN','FROM','TO','WITH',
        'THIS','PAGE','JOIN','CALL','TEXT','TEST','HERO','CARD','NAV','MENU','MAIN','ONE','WAY',
        'TOP','TIER','OPT','OUT','RESERVE','VIEW','DETAILS','NOW','BOOK','DISCOVER'
      ])
      const isCode = (s: string) => /^[A-Za-z]{3,4}$/.test(s) && !STOPWORDS.has(s)

      // pairs like KTEB → KOPF, TEB to OPF, (TEB) to (OPF)
      const re = /(?:\(|\b)([A-Za-z]{3,4})(?:\)|\b)[^A-Za-z]{0,60}?(?:→|to|-|–|—)[^A-Za-z]{0,60}?(?:\(|\b)([A-Za-z]{3,4})(?:\)|\b)/gi
      const set = new Set<string>()
      let m: RegExpExecArray | null
      while ((m = re.exec(bodyText))) {
        const o = m[1].toUpperCase(), d = m[2].toUpperCase()
        if (isCode(o) && isCode(d)) set.add(`${o}-${d}`)
      }
      return Array.from(set).map((key, i) => {
        const [o, d] = key.split('-')
        return {
          id: `magellan_textsweep_${o}_${d}_${i}`,
          operator: 'magellan',
          origin: o,
          destination: d,
          url: location.href,
        }
      })
    }) as Leg[]
    legs = sweep
  }

  return legs
}

async function scrapeViaDomAllFrames(page: Page): Promise<Leg[]> {
  const frames: (Page | Frame)[] = [page, ...page.frames().filter(f => f !== page.mainFrame())]
  const out: Leg[] = []
  for (const fr of frames) {
    try {
      out.push(...await extractFromFrame(fr))
    } catch {}
  }
  return out
}

// ---------- WP REST scraper ----------
async function scrapeViaWpRest(page: Page): Promise<Leg[]> {
  const endpoints = [
    '/wp-json/wp/v2/empty_legs?per_page=100',
    '/wp-json/wp/v2/empty-leg?per_page=100',
    '/wp-json/wp/v2/empty_leg?per_page=100',
    '/wp-json/wp/v2/legs?per_page=100',
    '/wp-json/wp/v2/mj_empty_legs?per_page=100',
    '/wp-admin/admin-ajax.php?action=empty_legs',
  ]
  const results = await page.evaluate(async (eps: string[]) => {
    // @ts-ignore
    ;(globalThis as any).__name = (fn: any) => fn
    const STOPWORDS = new Set([
      'DATA','LIKE','SIZE','FULL','MORE','READ','NEXT','BACK','HOME','INFO','LEARN','FROM','TO','WITH',
      'THIS','PAGE','JOIN','CALL','TEXT','TEST','HERO','CARD','NAV','MENU','MAIN','ONE','WAY',
      'TOP','TIER','OPT','OUT','RESERVE','VIEW','DETAILS','NOW','BOOK','DISCOVER'
    ])
    const norm = (s: string) => s.trim().toUpperCase()
    const isCode = (s?: string) => !!s && /^[A-Za-z]{3,4}$/.test(s.trim()) && !STOPWORDS.has(s.trim().toUpperCase())

    const out: any[] = []
    for (const ep of eps) {
      try {
        const res = await fetch(ep, { credentials: 'include' })
        if (!res.ok) continue
        const ctype = res.headers.get('content-type') || ''
        if (!/json/i.test(ctype)) continue
        const json = await res.json()
        const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : null
        if (!arr || !arr.length) continue
        for (const x of arr) {
          const title = (x.title?.rendered || x.title) ?? ''
          const acf = x.acf || x.meta || x
          const from = acf.origin || acf.from || acf.departure_airport || title
          const to   = acf.destination || acf.to || acf.arrival_airport   || title
          if (!from || !to) continue
          const o = norm(String(from)), d = norm(String(to))
          if (!isCode(o) || !isCode(d)) continue

          out.push({
            id: 'magellan_' + (x.id || x.slug || `${o}-${d}`),
            operator: 'magellan',
            origin: o,
            destination: d,
            departureUtc:
              acf.departureUtc || acf.departure_time_utc || acf.departure_datetime || acf.date || undefined,
            aircraft: acf.aircraft_type || acf.aircraft || undefined,
            price: typeof acf.price === 'number' ? acf.price : undefined,
            url: x.link || location.origin + ep,
          })
        }
        if (out.length) break
      } catch {}
    }
    return out
  }, endpoints)
  return results as Leg[]
}

export async function scrapeMagellan(): Promise<Leg[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const context: BrowserContext = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1400, height: 1000 },
  })

  // Neutralize esbuild’s __name helper
  await context.addInitScript(() => {
    // @ts-ignore
    ;(globalThis as any).__name = (fn: any) => fn
  })

  // Do NOT block third-parties broadly; some widgets fetch data from marketing CDNs.
  const page = await context.newPage()

  // Load page and give it time to render lazy content
  await page.goto('https://magellanjets.com/private-jet-services/empty-legs/', { waitUntil: 'domcontentloaded' })
  await acceptAndNukePopups(page)

  // gentle scroll to trigger lazy content
  for (let y = 0; y <= 4; y++) {
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(500)
  }
  await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => {})

  let legs: Leg[] = []
  try { legs = await scrapeViaNetwork(page) } catch {}

  if (!legs.length) {
    try { legs.push(...await scrapeViaDomAllFrames(page)) } catch {}
  }

  if (!legs.length) {
    try { legs.push(...await scrapeViaWpRest(page)) } catch {}
  }

  // Artifacts for debugging (main + frames)
  try {
    await fs.mkdir('tmp', { recursive: true })
    await fs.writeFile('tmp/magellan-raw.json', JSON.stringify(legs, null, 2), 'utf8')
    await page.screenshot({ path: 'tmp/magellan-page.png', fullPage: true })
    await fs.writeFile('tmp/magellan.html', await page.content(), 'utf8')

    // dump each frame’s text for visibility
    const frames = page.frames()
    const dump: Record<string, string> = {}
    for (const fr of frames) {
      const name = fr.name() || fr.url().slice(0, 80)
      try { dump[name || `frame-${dump.length}`] = await fr.evaluate(() => document.body?.innerText || '') } catch {}
    }
    await fs.writeFile('tmp/magellan-frames.txt', Object.entries(dump).map(([k,v]) => `=== ${k}\n${v}\n`).join('\n'), 'utf8')
  } catch {}

  await context.close()
  await browser.close()

  // De-dup + final hygiene
  const seen = new Set<string>()
  const isValidDate = (s?: string) => (s ? !Number.isNaN(Date.parse(s)) : false)

  legs = legs
    .filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
    .filter((l) => isLikelyAirportCode(l.origin) && isLikelyAirportCode(l.destination))
    .filter((l) => !/magellan_(main-navigation|navigation|header|footer|menu|card)/i.test(l.id))
    .map((l) => ({
      ...l,
      origin: norm(l.origin),
      destination: norm(l.destination),
      departureUtc: isValidDate(l.departureUtc) ? l.departureUtc : undefined,
      arrivalUtc: isValidDate(l.arrivalUtc) ? l.arrivalUtc : undefined,
    }))

  try {
    await fs.writeFile('tmp/magellan-kept.json', JSON.stringify(legs, null, 2), 'utf8')
    console.log(`Magellan filter: kept ${legs.length}. See tmp/magellan-kept.json`)
  } catch {}

  return legs
}