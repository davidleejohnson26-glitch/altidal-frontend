// src/app/api/legs/route.ts
import { NextRequest, NextResponse } from "next/server"
import type { Leg } from "@/lib/leg-types"
import { getUploadedLegs } from "@/lib/leg-store"

// ---- Seed legs (same shape as Leg) ----
const LEGS: Leg[] = [
  { id: "ALT-2501", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to: { iata: "TEB", name: "Teterboro", city: "New York" }, departAt: "2025-09-24T15:30:00Z", priceUSD: 14500, aircraft: { type: "Citation XLS", class: "midsize", seats: 7 }, operator: "Lone Star Jet" },
  { id: "ALT-2502", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to: { iata: "VNY", name: "Van Nuys", city: "Los Angeles" }, departAt: "2025-09-25T18:00:00Z", priceUSD: 22000, aircraft: { type: "Challenger 300", class: "super-midsize", seats: 8 }, operator: "Redbird Aviation", notes: "Pets ok; Wi-Fi" },
  { id: "ALT-2503", from: { iata: "ADS", name: "Addison", city: "Dallas" }, to:   { iata: "HOU", name: "William P. Hobby", city: "Houston" }, departAt: "2025-09-24T13:00:00Z", priceUSD: 3500, aircraft: { type: "Phenom 300", class: "light", seats: 6 }, operator: "Metro Jet Services" },
  { id: "ALT-2504", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "LAS", name: "Harry Reid Intl", city: "Las Vegas" }, departAt: "2025-09-27T21:15:00Z", priceUSD: 16000, aircraft: { type: "Citation Latitude", class: "super-midsize", seats: 8 }, operator: "Silver Arrow" },
  { id: "ALT-2505", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "MIA", name: "Miami Intl", city: "Miami" }, departAt: "2025-09-28T14:45:00Z", priceUSD: 17500, aircraft: { type: "Learjet 60XR", class: "midsize", seats: 7 }, operator: "Suncoast Charter" },
  { id: "ALT-2506", from: { iata: "AUS", name: "Austin–Bergstrom", city: "Austin" }, to:   { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, departAt: "2025-09-26T10:00:00Z", priceUSD: 2900, aircraft: { type: "King Air 350i", class: "light", seats: 8 }, operator: "Hill Country Air" },
  { id: "ALT-2507", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "SNA", name: "John Wayne", city: "Orange County" }, departAt: "2025-09-29T17:00:00Z", priceUSD: 18500, aircraft: { type: "Gulfstream G200", class: "super-midsize", seats: 9 }, operator: "Pacific Crest" },
  { id: "ALT-2508", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "ASE", name: "Aspen–Pitkin", city: "Aspen" }, departAt: "2025-09-30T16:20:00Z", priceUSD: 15000, aircraft: { type: "Pilatus PC-24", class: "light", seats: 6 }, operator: "Rocky Mountain Jet" },
  { id: "ALT-2509", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "ORD", name: "O'Hare", city: "Chicago" }, departAt: "2025-10-01T12:00:00Z", priceUSD: 9800, aircraft: { type: "Citation CJ3+", class: "light", seats: 6 }, operator: "Great Lakes Air" },
  { id: "ALT-2510", from: { iata: "DFW", name: "Dallas/Fort Worth", city: "Dallas–Fort Worth" }, to: { iata: "SEA", name: "Seattle–Tacoma", city: "Seattle" }, departAt: "2025-10-02T19:30:00Z", priceUSD: 24000, aircraft: { type: "Challenger 350", class: "super-midsize", seats: 9 }, operator: "Cascade Charter" },
  { id: "ALT-2511", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "PHX", name: "Phoenix Sky Harbor", city: "Phoenix" }, departAt: "2025-09-27T09:15:00Z", priceUSD: 10500, aircraft: { type: "Citation M2", class: "light", seats: 5 }, operator: "Sonoran Air" },
  { id: "ALT-2512", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "HND", name: "Haneda", city: "Tokyo" }, departAt: "2025-10-05T02:00:00Z", priceUSD: 98000, aircraft: { type: "Gulfstream G650ER", class: "ultra-long", seats: 13 }, operator: "TransPacific Jets", notes: "Tech stop Anchorage" },
  { id: "ALT-2513", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "CUN", name: "Cancún", city: "Cancún" }, departAt: "2025-09-26T15:45:00Z", priceUSD: 12000, aircraft: { type: "Learjet 45XR", class: "light", seats: 7 }, operator: "Mayan Jet" },
  { id: "ALT-2514", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "MCO", name: "Orlando Intl", city: "Orlando" }, departAt: "2025-10-03T11:20:00Z", priceUSD: 12500, aircraft: { type: "Citation Sovereign+", class: "super-midsize", seats: 8 }, operator: "SkyVista" },
  { id: "ALT-2515", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "SJC", name: "San Jose Intl", city: "San Jose" }, departAt: "2025-10-01T07:45:00Z", priceUSD: 21000, aircraft: { type: "Falcon 2000LXS", class: "heavy", seats: 10 }, operator: "Bay Area Charter" },
  { id: "ALT-2516", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "MSY", name: "Louis Armstrong", city: "New Orleans" }, departAt: "2025-09-25T22:10:00Z", priceUSD: 5200, aircraft: { type: "King Air 350i", class: "light", seats: 8 }, operator: "Gulf South Air" },
  { id: "ALT-2517", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "BOS", name: "Logan Intl", city: "Boston" }, departAt: "2025-09-30T12:30:00Z", priceUSD: 17500, aircraft: { type: "Citation XLS+", class: "midsize", seats: 7 }, operator: "Northeast Jet" },
  { id: "ALT-2518", from: { iata: "DAL", name: "Dallas Love Field", city: "Dallas" }, to:   { iata: "JAC", name: "Jackson Hole", city: "Jackson" }, departAt: "2025-10-04T16:10:00Z", priceUSD: 15500, aircraft: { type: "Pilatus PC-24", class: "light", seats: 6 }, operator: "Tetons Air" },
]

// ---- Filter helper (single definition) ----
function match(l: Leg, q: URLSearchParams) {
  const from = q.get("from")
  const to = q.get("to")
  const start = q.get("start")
  const end = q.get("end")
  const seats = q.get("seats")
  const cls = q.get("class") as Leg["aircraft"]["class"] | null

  let ok = true
  if (from) ok &&= l.from.iata.toUpperCase() === from.toUpperCase()
  if (to)   ok &&= l.to.iata.toUpperCase() === to.toUpperCase()
  if (seats) ok &&= (l.aircraft.seats || 0) >= Number(seats)

  if (cls) {
    const allowed = ["light", "midsize", "super-midsize", "heavy", "ultra-long"] as const
    if ((allowed as readonly string[]).includes(cls)) ok &&= l.aircraft.class === cls
  }

  if (start) ok &&= new Date(l.departAt) >= new Date(start)
  if (end)   ok &&= new Date(l.departAt) <= new Date(end)

  return ok
}

// ---- GET /api/legs (single definition) ----
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = url.searchParams

  // Combine seed + uploaded legs from in-memory store
  const all = [...LEGS, ...getUploadedLegs()]

  const results = all
    .filter((l) => match(l, q))
    .sort((a, b) => new Date(a.departAt).getTime() - new Date(b.departAt).getTime())

  return NextResponse.json({ count: results.length, legs: results }, { status: 200 })
}