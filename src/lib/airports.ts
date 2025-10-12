// lib/airports.ts
export type AirportIndex = Record<string, { lat: number; lon: number }>

let cache: AirportIndex | null = null

export async function loadAirports(): Promise<{ data: AirportIndex; count: number }> {
  if (cache) return { data: cache, count: Object.keys(cache).length }
  try {
    const url = '/data/airports.min.json'
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) throw new Error(`airports index ${res.status} ${url}`)
    const json = (await res.json()) as AirportIndex
    cache = json
    return { data: json, count: Object.keys(json).length }
  } catch (e) {
    console.warn('Failed to load airports index:', e)
    cache = {}
    return { data: cache, count: 0 }
  }
}