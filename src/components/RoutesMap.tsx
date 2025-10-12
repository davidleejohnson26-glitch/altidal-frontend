'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl, { Map } from 'maplibre-gl'
import { loadAirports } from '@/lib/airports'
import type {
  Feature,
  FeatureCollection,
  LineString,
  Point,
  GeoJsonProperties,
} from 'geojson'

type Leg = {
  id: string
  operator: 'airpartner' | 'xo' | 'magellan'
  fromIata: string | null
  toIata: string | null
  departAt: string | null
  priceUSD: number | null
}

export default function RoutesMap({ legs }: { legs: Leg[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const [ready, setReady] = useState(false)

  // Build GeoJSON from legs + airports
  const buildGeo = async () => {
    const airports = await loadAirports()
    // ✅ grab the actual index (handles both {data, count} and plain object)
    const airportIndex: Record<string, { lat: number; lon: number }> =
      (airports as any).data ?? (airports as any)

    const lineFeatures: Feature<LineString, GeoJsonProperties>[] = []
    const pointFeatures: Record<string, Feature<Point, GeoJsonProperties>> = {}

    for (const leg of legs) {
      const a = leg.fromIata?.toUpperCase() ?? ''
      const b = leg.toIata?.toUpperCase() ?? ''
      const A = airportIndex[a]
      const B = airportIndex[b]
      if (!A || !B) continue

      // Points
      if (!pointFeatures[a]) {
        pointFeatures[a] = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [A.lon, A.lat] },
          properties: { iata: a },
        }
      }
      if (!pointFeatures[b]) {
        pointFeatures[b] = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [B.lon, B.lat] },
          properties: { iata: b },
        }
      }

      // Line
      lineFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [A.lon, A.lat],
            [B.lon, B.lat],
          ],
        },
        properties: {
          id: leg.id,
          operator: leg.operator,
          from: a,
          to: b,
          price: leg.priceUSD ?? null,
          departAt: leg.departAt ?? null,
        },
      })
    }

    const lines: FeatureCollection<LineString, GeoJsonProperties> = {
      type: 'FeatureCollection',
      features: lineFeatures,
    }
    const points: FeatureCollection<Point, GeoJsonProperties> = {
      type: 'FeatureCollection',
      features: Object.values(pointFeatures),
    }

    return { lines, points }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [-30, 30],
      zoom: 2.2,
      attributionControl: { compact: true },
      dragRotate: false,
      touchPitch: false,
    })
    mapRef.current = map

    map.on('load', async () => {
      const { lines, points } = await buildGeo()

      // Sources (typed FeatureCollections)
      if (!map.getSource('legs-lines')) map.addSource('legs-lines', { type: 'geojson', data: lines })
      if (!map.getSource('legs-points')) map.addSource('legs-points', { type: 'geojson', data: points })

      // Lines layer (wide halo + core)
      if (!map.getLayer('legs-lines-halo')) {
        map.addLayer({
          id: 'legs-lines-halo',
          type: 'line',
          source: 'legs-lines',
          paint: {
            'line-color': '#ffffff',
            'line-width': 4,
            'line-opacity': 0.75,
          },
        })
      }
      if (!map.getLayer('legs-lines-core')) {
        map.addLayer({
          id: 'legs-lines-core',
          type: 'line',
          source: 'legs-lines',
          paint: {
            'line-color': [
              'match',
              ['get', 'operator'],
              'airpartner', '#0369a1',
              'xo', '#6d28d9',
              'magellan', '#047857',
              '#334155',
            ],
            'line-width': 2,
            'line-opacity': 0.9,
          },
        })
      }

      // Airport points
      if (!map.getLayer('legs-points')) {
        map.addLayer({
          id: 'legs-points',
          type: 'circle',
          source: 'legs-points',
          paint: {
            'circle-color': '#0ea5e9',
            'circle-radius': 3,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
          },
        })
      }

      // Hover popup for lines
      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false })
      map.on('mousemove', 'legs-lines-core', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const { from, to, operator, price, departAt } = f.properties as any
        const html = `
          <div style="font-size:12px">
            <div><strong>${from} → ${to}</strong></div>
            <div>${String(operator).toUpperCase()}</div>
            <div>${price ? `$${Number(price).toLocaleString()}` : 'Contact for price'}</div>
            <div>${departAt ? new Date(departAt).toLocaleString() : ''}</div>
          </div>
        `
        popup.setLngLat((e.lngLat as any)).setHTML(html).addTo(map)
      })
      map.on('mouseleave', 'legs-lines-core', () => popup.remove())

      // Fit to data
      try {
        if (lines.features.length > 0) {
          const coords = lines.features.flatMap((f) => (f.geometry as LineString).coordinates)
          const lons = coords.map((c) => c[0])
          const lats = coords.map((c) => c[1])
          const bounds = new maplibregl.LngLatBounds(
            [Math.min(...lons), Math.min(...lats)],
            [Math.max(...lons), Math.max(...lats)]
          )
          map.fitBounds(bounds, { padding: 60, animate: false })
        }
      } catch {}
      setReady(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rebuild data if legs change (hot reload/dev)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    ;(async () => {
      const { lines, points } = await buildGeo()
      const ls = map.getSource('legs-lines') as maplibregl.GeoJSONSource | undefined
      const ps = map.getSource('legs-points') as maplibregl.GeoJSONSource | undefined
      ls?.setData(lines)
      ps?.setData(points)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legs])

  return <div ref={containerRef} className="h-full w-full" aria-busy={!ready} />
}