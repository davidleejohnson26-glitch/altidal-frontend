import axios from 'axios'
import { $, normClass, isoDate, UA, ScrapedLeg } from '../utils'

// Example: change URL + selectors for the real site you choose
const URL = 'https://example-operator.com/empty-legs'

export async function scrapeExampleOperator(): Promise<ScrapedLeg[]> {
  const res = await axios.get(URL, { headers: { 'User-Agent': UA } })
  const $d = $(res.data)

  // Each card/row:
  const rows = $d('.empty-leg-card')
  const out: ScrapedLeg[] = []

  rows.each((_, el) => {
    const fromIata = $d(el).find('.from .iata').text().trim().toUpperCase() // e.g. "DAL"
    const toIata   = $d(el).find('.to .iata').text().trim().toUpperCase()
    const depart   = $d(el).find('.depart-time').text().trim()               // e.g. "2025-10-06 15:30"
    const priceTxt = $d(el).find('.price').text().replace(/[^\d]/g, '')
    const acType   = $d(el).find('.aircraft').text().trim()
    const acClass  = normClass($d(el).find('.category').text().trim())
    const seatsTxt = $d(el).find('.seats').text().replace(/[^\d]/g, '')

    if (!fromIata || !toIata || !depart) return

    out.push({
      id: `EXOP-${fromIata}-${toIata}-${depart}`,     // stable dedupe key
      fromIata,
      toIata,
      departAt: isoDate(depart),
      priceUSD: Number(priceTxt || 0),
      acType: acType || 'Unknown',
      acClass,
      seats: Number(seatsTxt || 0),
      operator: 'Example Operator',
      notes: undefined,
    })
  })

  return out
}