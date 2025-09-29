export type ScrapedLeg = {
  id: string
  fromIata: string
  fromName?: string
  fromCity?: string
  toIata: string
  toName?: string
  toCity?: string
  departAt: string   // ISO
  priceUSD: number
  acType: string
  acClass: 'light' | 'midsize' | 'super-midsize' | 'heavy' | 'ultra-long'
  seats: number
  operator: string
  notes?: string
}