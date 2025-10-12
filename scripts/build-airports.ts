// scripts/build-airports.ts
// Generate public/data/airports.min.json from an airports CSV with IATA + lat/lon
import { writeFile, mkdir, readFile } from 'fs/promises'
import { parse } from 'csv-parse/sync'

const SOURCES = [
  // GitHub Raw mirror — tends to avoid Windows TLS store issues
  'https://raw.githubusercontent.com/davidmegginson/ourairports-data/master/airports.csv',
  // Original site
  'https://ourairports.com/data/airports.csv',
] as const

const OUT_DIR = 'public/data'
const OUT_FILE = `${OUT_DIR}/airports.min.json`
const LOCAL_FALLBACK = 'scripts/data/airports.csv' // optional local copy

type Row = {
  iata_code: string
  latitude_deg: string
  longitude_deg: string
  type: string
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

async function getCsv(): Promise<string> {
  // 1) Try GitHub raw, then OurAirports
  for (const url of SOURCES) {
    try {
      console.log('Fetching:', url)
      const csv = await fetchText(url)
      console.log('OK:', url)
      return csv
    } catch (e) {
      console.warn('Fetch failed:', (e as Error).message)
    }
  }
  // 2) Try local fallback if present
  try {
    console.log('Trying local fallback:', LOCAL_FALLBACK)
    const csv = await readFile(LOCAL_FALLBACK, 'utf8')
    console.log('OK: local fallback')
    return csv
  } catch {
    // no local file
  }
  throw new Error('Unable to fetch airports.csv from any source. You can place a copy at ' + LOCAL_FALLBACK)
}

async function main() {
  const csv = await getCsv()

  console.log('Parsing CSV…')
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Row[]

  const out: Record<string, { lat: number; lon: number }> = {}
  let kept = 0
  let skipped = 0

  for (const r of rows) {
    const iata = (r.iata_code || '').trim().toUpperCase()
    if (!iata || iata.length !== 3) { skipped++; continue }

    const lat = Number(r.latitude_deg)
    const lon = Number(r.longitude_deg)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) { skipped++; continue }

    // Optional filter by type:
    // if (!['large_airport','medium_airport','small_airport'].includes(r.type)) { skipped++; continue }

    out[iata] = { lat, lon }
    kept++
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(out))
  console.log(`Wrote ${OUT_FILE}: ${kept} airports (skipped ${skipped})`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})