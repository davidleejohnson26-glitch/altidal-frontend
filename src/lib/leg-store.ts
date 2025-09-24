// src/lib/leg-store.ts
import type { Leg } from './leg-types'

// Global in-memory store (resets on redeploy / cold start)
const g = globalThis as any
if (!g.__ALTIDAL_LEG_STORE__) g.__ALTIDAL_LEG_STORE__ = [] as Leg[]

export function getUploadedLegs(): Leg[] {
  return g.__ALTIDAL_LEG_STORE__ as Leg[]
}

export function addUploadedLegs(legs: Leg[]) {
  const store = g.__ALTIDAL_LEG_STORE__ as Leg[]
  // de-dup by id
  const ids = new Set(store.map(l => l.id))
  const fresh = legs.filter(l => !ids.has(l.id))
  store.push(...fresh)
  return fresh.length
}