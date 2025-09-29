// scripts/run.ts
import fs from 'fs/promises'
import path from 'path'
import { scrapeMagellan, MAGELLAN_VERSION } from './sources/magellan'
import { saveLegs } from './save'
import 'dotenv/config'

console.log('SCRAPER DB:', process.env.DATABASE_URL)
console.log('[run] magellan scraper version:', MAGELLAN_VERSION)

type DisabledMap = Record<string, { reason: string; disabledUntil: string }>

const TMP_DIR = 'tmp'
const DISABLED_FILE = path.join(TMP_DIR, 'sources-disabled.json')

async function isSourceDisabled(key: string): Promise<{ disabled: boolean; until?: string; reason?: string }> {
  try {
    const raw = await fs.readFile(DISABLED_FILE, 'utf8')
    const map = JSON.parse(raw) as DisabledMap
    const entry = map[key]
    if (!entry) return { disabled: false }
    const now = Date.now()
    const until = new Date(entry.disabledUntil).getTime()
    if (Number.isFinite(until) && until > now) {
      return { disabled: true, until: entry.disabledUntil, reason: entry.reason }
    }
    // If cooldown expired, clean it up (best effort)
    try {
      delete map[key]
      await fs.writeFile(DISABLED_FILE, JSON.stringify(map, null, 2), 'utf8')
    } catch {}
    return { disabled: false }
  } catch {
    return { disabled: false }
  }
}

async function main() {
  const forceMagellan = process.env.FORCE_MAGELLAN === '1'

  // --- Magellan ---
  const status = await isSourceDisabled('magellan')
  if (status.disabled && !forceMagellan) {
    console.log(
      `Magellan: disabled until ${status.until}` +
      (status.reason ? ` — reason: ${status.reason}` : '') +
      ` (set FORCE_MAGELLAN=1 to override)`
    )
    return
  }

  console.log('Scraping Magellan Jets…')
  const legs = await scrapeMagellan()

  console.log(`Scraped ${legs.length} leg(s). Saving to DB…`)
  const added = await saveLegs(legs)

  console.log(`Magellan: scraped=${legs.length}, added=${added}`)
}

main().catch((e) => {
  console.error('Scrape failed:', e)
  process.exit(1)
})