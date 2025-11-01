// scripts/setup/build-airport-index.ts
// Usage: npx tsx scripts/setup/build-airport-index.ts
// Builds data/airports-index.json from OurAirports airports.csv (with resilient mirrors)

import fs from 'fs/promises'
import path from 'path'
import https from 'https'
import http from 'http'
import { createInterface } from 'readline'

const DATA_DIR = path.join(process.cwd(), 'data')
const CSV_PATH = path.join(DATA_DIR, 'airports.csv')
const OUT_PATH = path.join(DATA_DIR, 'airports-index.json')

// Mirrors (order matters: fastest/most reliable first)
const SOURCES = [
  // GitHub raw mirror (daily updates via data dump)
  'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv',
  // GitHub Pages mirror (same content, CDN backed)
  'https://davidmegginson.github.io/ourairports-data/airports.csv',
  // Primary site (some environments have cert chain issues)
  'https://ourairports.com/data/airports.csv',
  // Older direct path that still works
  'https://ourairports.com/airports.csv',
]

const TIMEOUT_MS = 25_000
const RETRIES = 3

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

async function download(url: string, destFile: string): Promise<void> {
  const allowInsecure = process.env.ALLOW_INSECURE === '1'
  const agentHttps = new https.Agent({ rejectUnauthorized: !allowInsecure })
  const agentHttp = new http.Agent()

  await new Promise<void>((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.get(url, { agent: url.startsWith('https') ? agentHttps : agentHttp, timeout: TIMEOUT_MS }, (res) => {
      // Follow simple redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        download(new URL(res.headers.location, url).toString(), destFile).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const writeStreamPromise = fs.open(destFile, 'w').then(fh => {
        const ws = fh.createWriteStream()
        res.pipe(ws)
        return new Promise<void>((resOk, resErr) => {
          ws.on('finish', resOk)
          ws.on('error', resErr)
        }).finally(async () => { await fh.close() })
      })
      writeStreamPromise.then(resolve).catch(reject)
    })
    req.on('timeout', () => { req.destroy(new Error('Request timeout')) })
    req.on('error', reject)
  })
}

async function downloadWithFallback(): Promise<void> {
  await ensureDir()
  for (const src of SOURCES) {
    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        console.log(`[airports] downloading (attempt ${attempt}): ${src}`)
        await download(src, CSV_PATH)
        console.log('[airports] download complete.')
        return
      } catch (e: any) {
        console.warn(`[airports] failed from ${src}: ${e?.message || e}`)
        if (attempt === RETRIES) break
        await new Promise(r => setTimeout(r, 500 * attempt))
      }
    }
  }
  throw new Error('All sources failed. You can try: ALLOW_INSECURE=1 npx tsx scripts/setup/build-airport-index.ts')
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; continue }
      quoted = !quoted
      continue
    }
    if (ch === ',' && !quoted) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out
}

async function build() {
  try { await fs.access(CSV_PATH) } catch {
    await downloadWithFallback()
  }

  const fh = await fs.open(CSV_PATH, 'r')
  const rl = createInterface({ input: fh.createReadStream() })

  let headerLine = await new Promise<string>((resolve) => rl.once('line', (h: string) => resolve(h)))
  const cols = parseCsvLine(headerLine)

  const idx = {
    ident: cols.indexOf('ident'),
    iata: cols.indexOf('iata_code'),
    name: cols.indexOf('name'),
    iso: cols.indexOf('iso_country'),
    type: cols.indexOf('type'),
    lat: cols.indexOf('latitude_deg'),
    lon: cols.indexOf('longitude_deg'),
    city: cols.indexOf('municipality'),
  }

  const ICAO2IATA: Record<string, string> = {}
  const IATA2ICAO: Record<string, string> = {}
  const META: Record<string, { name?: string, city?: string, iso?: string, lat?: number, lon?: number }> = {}

  rl.on('line', (line: string) => {
    const f = parseCsvLine(line)
    const ident = (f[idx.ident] || '').trim().toUpperCase()
    const iata  = (f[idx.iata]  || '').trim().toUpperCase()
    const name  = (f[idx.name]  || '').trim()
    const iso   = (f[idx.iso]   || '').trim().toUpperCase()
    const type  = (f[idx.type]  || '').trim()
    const lat   = Number(f[idx.lat] || '')
    const lon   = Number(f[idx.lon] || '')
    const city  = (f[idx.city]  || '').trim()

    const isICAO = /^[A-Z]{4}$/.test(ident)
    const isIATA = /^[A-Z]{3}$/.test(iata)

    // Prefer large/medium airports but keep small when IATA exists
    if (!isICAO && !isIATA) return
    if (!/large|medium/i.test(type || '') && !isIATA) return

    if (isICAO && isIATA) {
      if (!ICAO2IATA[ident]) ICAO2IATA[ident] = iata
      if (!IATA2ICAO[iata])  IATA2ICAO[iata] = ident
    }

    const key = isICAO ? ident : (isIATA ? iata : '')
    if (key && !META[key]) {
      META[key] = {
        name: name || undefined,
        city: city || undefined,
        iso: iso || undefined,
        lat: Number.isFinite(lat) ? lat : undefined,
        lon: Number.isFinite(lon) ? lon : undefined,
      }
    }
  })

  await new Promise<void>((resolve) => rl.once('close', () => resolve()))
  await fh.close()

  const out = { ICAO2IATA, IATA2ICAO, META, source: 'OurAirports', generatedAt: new Date().toISOString() }
  await fs.writeFile(OUT_PATH, JSON.stringify(out), 'utf8')
  console.log(`[airports] wrote ${OUT_PATH}  ICAO:${Object.keys(ICAO2IATA).length}  IATA:${Object.keys(IATA2ICAO).length}`)
}

build().catch((e) => { console.error(e); process.exit(1) })
