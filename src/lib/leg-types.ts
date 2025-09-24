// src/lib/leg-types.ts
export type Leg = {
  id: string
  from: { iata: string; name: string; city: string }
  to: { iata: string; name: string; city: string }
  departAt: string // ISO
  priceUSD: number
  aircraft: {
    type: string
    class: 'light' | 'midsize' | 'super-midsize' | 'heavy' | 'ultra-long'
    seats: number
  }
  operator: string
  notes?: string
  // Optional UI fields:
  start?: string
  end?: string
  verifiedAt?: string
}