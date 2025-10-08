// scripts/sources/airpartner.ts
import { chromium, Response, Page, Frame } from 'playwright';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto'; // ← NEW

export type ScrapedLeg = {
  id: string;
  operator: string;
  fromIata?: string;
  toIata?: string;
  departureUtc?: string;
  arrivalUtc?: string | null;
  aircraft?: string | null;
  price?: number | null;
  url: string;
  sourceMeta?: any;
};

const URL = 'https://www.airpartner.com/en-us/private-jets/empty-legs/';
const TMP = 'tmp';

async function ensureTmpDir() { try { await fs.mkdir(TMP, { recursive: true }); } catch {} }

/* ---------------- cookie + ui helpers ---------------- */

async function clickMany(target: Page | Frame, selectors: string[]) {
  for (const sel of selectors) {
    try {
      const loc = target.locator(sel);
      if (await loc.isVisible({ timeout: 400 }).catch(() => false)) {
        try { await loc.scrollIntoViewIfNeeded(); } catch {}
        await loc.click({ timeout: 1200 }).catch(() => {});
        await target.waitForTimeout(150);
      }
    } catch {}
  }
}

async function acceptOneTrustAPI(target: Page | Frame) {
  try {
    await (target as Page).evaluate(() => {
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any).OneTrust?.AcceptAll) {
        // @ts-ignore
        (window as any).OneTrust.AcceptAll();
      }
    });
  } catch {}
}

async function dismissCookiesEverywhere(page: Page) {
  await clickMany(page, [
    '#onetrust-accept-btn-handler',
    'button#onetrust-accept-btn-handler',
    'button:has-text("Accept All Cookies")',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
    'button:has-text("Agree")',
    'button:has-text("OK")',
    'button:has-text("I Accept")',
  ]);
  await acceptOneTrustAPI(page);
  for (const f of page.frames()) {
    await clickMany(f, [
      '#onetrust-accept-btn-handler',
      'button#onetrust-accept-btn-handler',
      'button:has-text("Accept All Cookies")',
      'button:has-text("Accept all cookies")',
      'button:has-text("Accept all")',
      'button:has-text("Accept")',
      'button:has-text("Agree")',
      'button:has-text("OK")',
      'button:has-text("I Accept")',
    ]);
    await acceptOneTrustAPI(f);
  }
  try {
    await (page as Page).evaluate(() => {
      const exp = new Date(Date.now() + 365*24*3600*1000).toUTCString();
      document.cookie =
        'OptanonConsent=isIABGlobal=false&datestamp=' + encodeURIComponent(new Date().toISOString()) +
        '&version=6.33.0&groups=1:1,2:1,3:1,4:1; domain=.airpartner.com; path=/; expires=' + exp + '; SameSite=Lax';
    });
  } catch {}
  await page.waitForTimeout(300);
}

/** Some geos only mount the widget after clicking the "Empty legs" CTA */
async function clickEmptyLegsCTA(page: Page) {
  await clickMany(page, [
    'a:has-text("Empty legs")',
    'a:has-text("EMPTY LEGS")',
    'button:has-text("Empty legs")',
    'button:has-text("EMPTY LEGS")',
    'a[href*="#empty"]',
  ]);
}

async function slowScrollPage(page: Page, steps = 6, stepPx = 800) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepPx);
    await page.waitForTimeout(150);
  }
}

async function slowScrollFrame(frame: Frame, steps = 6, step = 800) {
  for (let i = 0; i < steps; i++) {
    try { await frame.evaluate((y) => window.scrollBy(0, y), step); } catch {}
    await frame.waitForTimeout(150);
  }
}

async function expandInsideFrames(page: Page, maxLoops = 10) {
  for (let loop = 0; loop < maxLoops; loop++) {
    let clickedAny = false;
    for (const f of page.frames()) {
      const candidates = [
        f.getByRole('button', { name: /show more/i }),
        f.getByRole('button', { name: /load more/i }),
        f.locator('button:has-text("Show more")'),
        f.locator('button:has-text("Load more")'),
        f.locator('a:has-text("Show more")'),
        f.locator('a:has-text("Load more")'),
      ];
      for (const c of candidates) {
        try {
          if (await c.isVisible({ timeout: 250 }).catch(() => false)) {
            try { await c.scrollIntoViewIfNeeded(); } catch {}
            await Promise.allSettled([
              c.click({ timeout: 1200 }),
              f.waitForLoadState?.('load', { timeout: 3000 }).catch(() => {}),
            ]);
            clickedAny = true;
            break;
          }
        } catch {}
      }
    }
    if (!clickedAny) break;
    await page.waitForTimeout(500);
  }
}

/* ---------------- parsing utils ---------------- */

const IATA_RE = /^[A-Z]{3}$/;
const STOP_IATA = new Set([
  'AND','THE','OUR','ARE','MAY','NOT','BUT','FOR','YOU','ANY','ALL','ONE','TWO',
  'JAN','FEB','MAR','APR','JUN','JUL','AUG','SEP','OCT','NOV','DEC',
  'MON','TUE','WED','THU','FRI','SAT','SUN'
]);

function isIata(x?: string): x is string {
  return !!x && IATA_RE.test(x) && !STOP_IATA.has(x);
}

function toMidnightUTCISO(d: string | number | Date): string | undefined {
  const dt = new Date(d as any);
  return Number.isNaN(dt.getTime())
    ? undefined
    : new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())).toISOString();
}

function parseCardPrice(text: string): number | null {
  const m = text.match(/[$€£]\s?([\d,]+)(?:\.\d{2})?/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* ---- JSON path (kept as first pass, may be empty for Avinode) ---- */

function iataFromAirportNode(n: any): string | undefined {
  if (!n || typeof n !== 'object') return;
  const candidates = [n.iata, n.iataCode, n.code, n.airportCode];
  for (const c of candidates) {
    if (typeof c === 'string' && isIata(c.toUpperCase())) return c.toUpperCase();
  }
  for (const k of Object.keys(n)) {
    const v = (n as any)[k];
    if (v && typeof v === 'object') {
      const inner = iataFromAirportNode(v);
      if (inner) return inner;
    }
  }
  return undefined;
}

function pickAirport(obj: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    const code =
      typeof v === 'string' ? (isIata(v.toUpperCase()) ? v.toUpperCase() : undefined)
      : iataFromAirportNode(v);
    if (code) return code;
  }
  return undefined;
}

function pickDateISO(obj: any, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v == null) continue;

    if (typeof v === 'number') {
      const ms = v > 1e12 ? v : v * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return toMidnightUTCISO(d);
    }
    if (typeof v === 'string') {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return toMidnightUTCISO(d);
      const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3])).toISOString();
    }
    if (typeof v === 'object') {
      const iso = pickDateISO(v, Object.keys(v));
      if (iso) return iso;
    }
  }
  return undefined;
}

function pickAircraft(obj: any): string | null {
  const s =
    obj?.aircraftType ||
    obj?.aircraft ||
    obj?.equipment ||
    obj?.tail?.type ||
    obj?.acType ||
    null;
  return typeof s === 'string' ? s : null;
}

function pickPriceObj(obj: any): number | null {
  const raw = obj?.price ?? obj?.amount ?? obj?.total ?? obj?.displayPrice;
  const n = typeof raw === 'string' ? Number(raw.replace(/[^\d.]/g, '')) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/* ---------- Stable ID helpers (NEW) ---------- */

function stableHash(...parts: Array<string | number | null | undefined>): string {
  const raw = parts.filter(v => v !== undefined && v !== null).join('|');
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 10);
}

function makeLegIdFromHit(hit: any, seg: any, departISO: string): string {
  const base = hit?.emptyLegId ?? hit?.id ?? hit?.uuid ?? null;
  if (base) {
    return `airpartner:${String(base)}:${seg.start}-${seg.end}:${departISO}`;
  }
  const h = stableHash(seg.start, seg.end, departISO, hit?.uniqueName, hit?.tailNumber, hit?.operatorId);
  return `airpartner:${h}:${seg.start}-${seg.end}:${departISO}`;
}

function makeLegIdFromJsonNode(node: any, from: string, to: string, departISO: string): string {
  const base = node?.emptyLegId ?? node?.id ?? node?.uuid ?? node?.legId ?? null;
  if (base) {
    return `airpartner:${String(base)}:${from}-${to}:${departISO}`;
  }
  const h = stableHash(from, to, departISO, node?.uniqueName, node?.aircraft, node?.tailNumber, node?.operatorId, node?.source);
  return `airpartner:${h}:${from}-${to}:${departISO}`;
}

/* ---------- Normalizers ---------- */

function normalizeFromCapturedJSON(payloads: Array<{ url: string; data: any }>): ScrapedLeg[] {
  const out: ScrapedLeg[] = [];
  const seen = new Set<string>();

  const KF = {
    FROM: ['from','origin','fromAirport','originAirport','departureAirport','startAirport','depAirport','fromLocation','fromPoint'],
    TO:   ['to','destination','toAirport','destinationAirport','arrivalAirport','endAirport','arrAirport','toLocation','toPoint'],
    DATE: ['departure','departureDate','date','start','etd','departAt','scheduledDeparture','startDate','departureUtc','departureTimeUtc','fromDate','startTime'],
  };

  const stack: any[] = [];
  for (const { data, url } of payloads) {
    stack.push({ node: data, url });
    while (stack.length) {
      const { node, url: src } = stack.pop()!;
      if (!node) continue;

      if (Array.isArray(node)) { for (const v of node) stack.push({ node: v, url: src }); continue; }
      if (typeof node !== 'object') continue;

      const from = pickAirport(node, KF.FROM);
      const to   = pickAirport(node, KF.TO);
      const departISO = pickDateISO(node, KF.DATE);

      if (isIata(from) && isIata(to) && departISO) {
        const id = makeLegIdFromJsonNode(node, from, to, departISO); // ← NEW
        if (!seen.has(id)) {
          seen.add(id);
          out.push({
            id,
            operator: 'airpartner',
            fromIata: from,
            toIata: to,
            departureUtc: departISO,
            arrivalUtc: null,
            aircraft: pickAircraft(node),
            price: pickPriceObj(node),
            url: URL,
            sourceMeta: { api: src }
          });
        }
      }

      for (const k of Object.keys(node)) {
        const v = (node as any)[k];
        if (v && (typeof v === 'object' || Array.isArray(v))) stack.push({ node: v, url: src });
      }
    }
  }
  return out;
}

/* ------------ Frame-HTML + settings parser (Avinode) ------------ */

function extractFromFrameHTML(html: string, frameUrl: string): ScrapedLeg[] {
  const $ = cheerio.load(html);
  const legs: ScrapedLeg[] = [];
  const seen = new Set<string>();

  const ctas = $('a,button').filter((_, el) =>
    /details|enquire|request|quote|view/i.test($(el).text().trim())
  );

  ctas.each((_, el) => {
    let node = $(el).closest('article, li, div, section, tr');
    let hops = 0;
    while (hops < 6 && node.length) {
      const text = node.text().replace(/\s+/g, ' ').trim();
      const codes = Array.from(text.matchAll(/\(([A-Z]{3})\)/g)).map(m => m[1]?.toUpperCase()).filter(Boolean);
      if (codes.length >= 2) {
        const unique = Array.from(new Set(codes));
        const from = unique[0];
        const to = unique.find(c => c !== from);
        if (isIata(from) && isIata(to)) {
          const md = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?/i);
          if (md) {
            const withYear = /,\s*\d{4}/.test(md[0]) ? md[0] : `${md[0]}, ${new Date().getUTCFullYear()}`;
            const departISO = toMidnightUTCISO(withYear);
            if (departISO) {
              // hash fallback so text-scraped items don't collide
              const h = stableHash(from, to, departISO, frameUrl, text);
              const id = `airpartner:${h}:${from}-${to}:${departISO}`;
              if (!seen.has(id)) {
                seen.add(id);
                legs.push({
                  id,
                  operator: 'airpartner',
                  fromIata: from,
                  toIata: to,
                  departureUtc: departISO,
                  arrivalUtc: null,
                  aircraft: null,
                  price: parseCardPrice(text),
                  url: URL,
                  sourceMeta: { method: 'iframe-html', frameUrl }
                });
              }
            }
          }
        }
        break;
      }
      node = node.parent();
      hops++;
    }
  });

  return legs;
}

/** Read Avinode's #settings JSON directly from a frame and normalize. */
async function extractFromFrameSettings(frame: Frame): Promise<ScrapedLeg[]> {
  try {
    const raw = await frame.evaluate(() => {
      const el = document.querySelector('#settings');
      return el ? (el as HTMLScriptElement).textContent : null;
    });
    if (!raw) return [];
    const json = JSON.parse(raw);
    const pre = json?.preLoadedEmptyLegSearch ?? json?.preLoadedEmptyLegsSearch;
    const hits = pre?.searchHits as any[] | undefined;
    if (!hits || !Array.isArray(hits) || hits.length === 0) return [];

    const legs: ScrapedLeg[] = [];
    for (const hit of hits) {
      const ac = typeof hit.uniqueName === 'string' ? hit.uniqueName : null;
      const price =
        typeof hit.rawPrice === 'number' ? Math.round(hit.rawPrice) :
        typeof hit.price === 'number' ? Math.round(hit.price) : null;

      const segs: any[] = Array.isArray(hit.segments) ? hit.segments : [];
      for (const seg of segs) {
        const from = String(seg.start ?? '').toUpperCase();
        const to   = String(seg.end ?? '').toUpperCase();
        if (!isIata(from) || !isIata(to)) continue;

        const departISO =
          toMidnightUTCISO(seg.availableFrom) ??
          toMidnightUTCISO(seg.availableTo) ??
          undefined;
        if (!departISO) continue;

        const id = makeLegIdFromHit(hit, seg, departISO); // ← NEW

        legs.push({
          id,
          operator: 'airpartner',
          fromIata: from,
          toIata: to,
          departureUtc: departISO,
          arrivalUtc: null,
          aircraft: ac,
          price: price,
          url: URL,
          sourceMeta: {
            method: 'iframe-settings',
            currency: hit.currency || json?.selectedCurrency?.currencyCode,
            flightTime: seg.flightTime,
            startText: seg.startAsHumanText,
            endText: seg.endAsHumanText,
          },
        });
      }
    }

    return legs;
  } catch {
    return [];
  }
}

/* ------- Minimal, opt-in origin sweep (does nothing unless env set) ------- */

function parseOriginsEnv(): string[] {
  const env = (process.env.AIRPARTNER_ORIGINS || '').trim();
  if (!env) return []; // default: NO sweep
  const raw = env.split(',').map(s => s.trim().toUpperCase()).filter(isIata);
  const perRun = Math.max(1, Math.min(6, Number(process.env.AIRPARTNER_ORIGINS_PER_RUN) || 2));
  return Array.from(new Set(raw)).slice(0, perRun);
}

async function readPreloadedOrigin(frame: Frame): Promise<string | undefined> {
  try {
    const raw = await frame.evaluate(() => (document.querySelector('#settings') as HTMLScriptElement)?.textContent || null);
    if (!raw) return;
    const json = JSON.parse(raw);
    const pre =
      (json?.preLoadedEmptyLegAirport && String(json.preLoadedEmptyLegAirport)) ||
      (json?.query?.airport && String(json.query.airport)) ||
      '';
    const code = pre.toUpperCase();
    return isIata(code) ? code : undefined;
  } catch { return; }
}

function changeOriginInUrl(src: string, origin: string): string {
  const u = new (globalThis as any).URL(src);
  const keys = ['airport','emptyLegAirport','preLoadedEmptyLegAirport','from','start','origin','originAirport','startAirport'];
  for (const [k,v] of u.searchParams.entries()) {
    if (keys.includes(k) || (v && isIata(v.toUpperCase()))) {
      u.searchParams.set(k, origin);
      return u.toString();
    }
  }
  u.searchParams.set('airport', origin);
  return u.toString();
}

async function navigateFrameByChangingSrc(page: Page, frame: Frame, newUrl: string) {
  const handles = await page.locator('iframe').elementHandles();
  for (const h of handles) {
    const cf = await h.contentFrame();
    if (cf === frame) {
      await h.evaluate((el, url) => { (el as HTMLIFrameElement).src = url as string; }, newUrl);
      return;
    }
  }
}

/* ---------------- Main scraper ---------------- */

export async function scrapeAirPartner(): Promise<ScrapedLeg[]> {
  await ensureTmpDir();

  const browser = await chromium.launch({
    headless: process.env.HEADFUL === '1' ? false : true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  });
  const page = await context.newPage();

  // Capture ALL JSON (we'll try it first; some regions return structured feeds)
  const capturedJson: Array<{ url: string; data: any }> = [];
  page.on('response', async (resp: Response) => {
    try {
      const type = resp.request().resourceType();
      if (!/xhr|fetch/i.test(type)) return;
      const ct = resp.headers()['content-type'] || '';
      if (!ct.includes('application/json')) return;
      const data = await resp.json().catch(() => null);
      if (data) capturedJson.push({ url: resp.url(), data });
    } catch {}
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });

  await dismissCookiesEverywhere(page).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await clickEmptyLegsCTA(page); // ensure widget mounts if it’s gated by CTA
  await slowScrollPage(page);
  await expandInsideFrames(page, 12);

  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('iframe')).some((el:any) => /avinode/i.test(el.src)),
    { timeout: 25_000 }
  ).catch(() => {});

  // 1) Try JSON normalization (network responses)
  let legs: ScrapedLeg[] = normalizeFromCapturedJSON(capturedJson);

  // De-dupe as we go (in addition to the final map)
  const seenIds = new Set<string>();
  for (const l of legs) seenIds.add(l.id);

  // 2) Parse Avinode frames' #settings JSON directly (working path)
  const frames = page.frames().filter(f => /apps\.avinode\.com/i.test(f.url()) || /avinode/i.test(f.url()));
  const extraOrigins = parseOriginsEnv(); // empty unless env set
  const tried = new Set<string>();
  let idx = 0;

  for (const f of frames) {
    const base = await extractFromFrameSettings(f);
    for (const L of base) if (!seenIds.has(L.id)) { seenIds.add(L.id); legs.push(L); }

    if (extraOrigins.length) {
      const pre = await readPreloadedOrigin(f);
      const thisSrc = await page.$eval('iframe[src*="avinode"]', (el: HTMLIFrameElement) => el.src).catch(() => f.url());
      for (const origin of extraOrigins) {
        if (origin === pre) continue;
        if (tried.has(origin)) continue;
        const next = changeOriginInUrl(thisSrc, origin);
        try {
          await navigateFrameByChangingSrc(page, f, next);
          await f.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
          await f.waitForSelector('#settings', { timeout: 12000 }).catch(() => {});
          const more = await extractFromFrameSettings(f);
          for (const L of more) if (!seenIds.has(L.id)) { seenIds.add(L.id); legs.push(L); }
        } catch {}
        tried.add(origin);
        await f.waitForTimeout(350);
      }
    }

    // (debug artifacts + HTML fallback)
    try {
      const handles = await page.locator('iframe').elementHandles();
      for (const h of handles) {
        const cf = await h.contentFrame();
        if (cf === f) {
          const box = await h.boundingBox();
          if (box) {
            await page.screenshot({ path: path.join(TMP, `airpartner-frame-${idx}.png`), clip: box });
          }
          break;
        }
      }
    } catch {}
    const html = await f.evaluate(() => document.documentElement.outerHTML).catch(() => '');
    if (html) {
      await fs.writeFile(path.join(TMP, `airpartner-frame-${idx}.html`), html, 'utf8').catch(() => {});
      const fallback = extractFromFrameHTML(html, f.url());
      for (const L of fallback) if (!seenIds.has(L.id)) { seenIds.add(L.id); legs.push(L); }
    }
    idx++;
  }

  // final de-dupe (cheap)
  const map = new Map<string, ScrapedLeg>();
  for (const l of legs) map.set(l.id!, l);
  legs = Array.from(map.values());

  await browser.close();
  await fs.writeFile(path.join(TMP, 'airpartner-parsed.json'), JSON.stringify(legs, null, 2), 'utf8').catch(() => {});
  return legs;
}