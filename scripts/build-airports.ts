// scripts/build-airports.ts
// Generate:
//   public/data/airports.min.json     -> { [IATA]: { lat, lon } }
//   public/data/airports.index.json   -> { icaoToIata: {...}, iataToIcao: {...} }
//   public/data/airports.cities.json  -> { [IATA]: { city, name, country } }

import { writeFile, mkdir, readFile } from 'fs/promises'
import { parse } from 'csv-parse/sync'

const SOURCES = [
  'https://raw.githubusercontent.com/davidmegginson/ourairports-data/master/airports.csv',
  'https://ourairports.com/data/airports.csv',
] as const

const OUT_DIR = 'public/data'
const OUT_MAIN = `${OUT_DIR}/airports.min.json`
const OUT_INDEX = `${OUT_DIR}/airports.index.json`
const OUT_CITIES = `${OUT_DIR}/airports.cities.json`
const LOCAL_FALLBACK = 'scripts/data/airports.csv'

type Row = {
  ident: string            // ICAO or local ident
  iata_code: string
  latitude_deg: string
  longitude_deg: string
  type: string
  name?: string
  municipality?: string
  iso_country?: string
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

async function getCsv(): Promise<string> {
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
  try {
    console.log('Trying local fallback:', LOCAL_FALLBACK)
    const csv = await readFile(LOCAL_FALLBACK, 'utf8')
    console.log('OK: local fallback')
    return csv
  } catch {}
  throw new Error('Unable to fetch airports.csv from any source. You can place a copy at ' + LOCAL_FALLBACK)
}

// --- small string helpers ---
function clean(s?: string | null): string {
  return (s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim()
}

function pickCity(row: Row): string | null {
  // Prefer municipality from OurAirports
  const m = clean(row.municipality)
  if (m) return m

  // Fallback: try to infer from name, e.g., "Nice-Côte d'Azur International Airport"
  const name = clean(row.name)
  if (!name) return null

  // crude heuristics: take left side of " - " or content inside parentheses
  const paren = name.match(/\(([^)]+)\)/)?.[1]
  if (paren && paren.length >= 2 && paren.length <= 40) return paren
  const dashLeft = name.split(' - ')[0]
  if (dashLeft && dashLeft.length >= 2) return dashLeft

  // last fallback: first tokenized segment
  const firstComma = name.split(',')[0]
  return firstComma && firstComma.length >= 2 ? firstComma : null
}

function pickDisplayName(row: Row): string | null {
  const name = clean(row.name)
  return name || null
}

async function main() {
  const csv = await getCsv()

  console.log('Parsing CSV…')
  const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Row[]

  const iataMin: Record<string, { lat: number; lon: number }> = {}
  const icaoToIata: Record<string, string> = {}
  const iataToIcao: Record<string, string> = {}
  const iataCities: Record<string, { city: string; name: string; country: string }> = {}

  let kept = 0
  let skippedMain = 0
  let cross = 0
  let cityKept = 0

  for (const r of rows) {
    const iata = clean(r.iata_code).toUpperCase()
    const icao = clean(r.ident).toUpperCase()
    const lat = Number(r.latitude_deg)
    const lon = Number(r.longitude_deg)
    const name = pickDisplayName(r)
    const city = pickCity(r)
    const country = clean(r.iso_country).toUpperCase()

    // Main lat/lon file (strict)
    if (iata && iata.length === 3 && Number.isFinite(lat) && Number.isFinite(lon)) {
      iataMin[iata] = { lat, lon }
      kept++
    } else {
      skippedMain++
    }

    // Cross index (ICAO<->IATA)
    if (iata && iata.length === 3 && icao && icao.length === 4) {
      // prefer first-seen ICAO per IATA; OurAirports may have duplicates
      if (!iataToIcao[iata]) iataToIcao[iata] = icao
      icaoToIata[icao] = iata
      cross++
    }

    // Cities/name (looser: needs IATA + at least city or name)
    if (iata && iata.length === 3 && (city || name)) {
      const entry = {
        city: city ?? '',
        name: name ?? '',
        country: country || '',
      }
      // If an entry already exists, prefer the one with both city & name filled
      if (!iataCities[iata]) {
        iataCities[iata] = entry
        cityKept++
      } else {
        const cur = iataCities[iata]
        const curScore = (cur.city ? 1 : 0) + (cur.name ? 1 : 0)
        const newScore = (entry.city ? 1 : 0) + (entry.name ? 1 : 0)
        if (newScore > curScore) iataCities[iata] = entry
      }
    }
  }

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_MAIN, JSON.stringify(iataMin))
  await writeFile(OUT_INDEX, JSON.stringify({ icaoToIata, iataToIcao }))
  await writeFile(OUT_CITIES, JSON.stringify(iataCities))

  console.log(`Wrote ${OUT_MAIN}: ${Object.keys(iataMin).length} airports (skipped ${skippedMain})`)
  console.log(`Wrote ${OUT_INDEX}: icao→iata=${Object.keys(icaoToIata).length}, iata→icao=${Object.keys(iataToIcao).length}`)
  console.log(`Wrote ${OUT_CITIES}: city/name for ${Object.keys(iataCities).length} IATA codes`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
