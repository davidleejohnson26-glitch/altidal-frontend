// scripts/run.ts
import fs from 'fs/promises';
import path from 'path';
import { scrapeMagellan, MAGELLAN_VERSION } from './sources/magellan';
import { scrapeAirPartner } from './sources/airpartner';
import { saveLegs } from './save';
import 'dotenv/config';

console.log('SCRAPER DB:', process.env.DATABASE_URL);
console.log('[run] magellan scraper version:', MAGELLAN_VERSION);

type DisabledMap = Record<string, { reason: string; disabledUntil: string }>;

const TMP_DIR = 'tmp';
const DISABLED_FILE = path.join(TMP_DIR, 'sources-disabled.json');

async function ensureTmpDir() {
  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
  } catch {}
}

async function readDisabledMap(): Promise<DisabledMap> {
  try {
    const raw = await fs.readFile(DISABLED_FILE, 'utf8');
    return JSON.parse(raw) as DisabledMap;
  } catch {
    return {};
  }
}

async function writeDisabledMap(map: DisabledMap) {
  await ensureTmpDir();
  await fs.writeFile(DISABLED_FILE, JSON.stringify(map, null, 2), 'utf8');
}

async function isSourceDisabled(key: string): Promise<{ disabled: boolean; until?: string; reason?: string }> {
  const map = await readDisabledMap();
  const entry = map[key];
  if (!entry) return { disabled: false };
  const now = Date.now();
  const until = new Date(entry.disabledUntil).getTime();
  if (Number.isFinite(until) && until > now) {
    return { disabled: true, until: entry.disabledUntil, reason: entry.reason };
  }
  // cooldown expired → clean it up
  delete map[key];
  await writeDisabledMap(map);
  return { disabled: false };
}

async function disableSource(key: string, minutes: number, reason: string) {
  const map = await readDisabledMap();
  const until = new Date(Date.now() + minutes * 60_000).toISOString();
  map[key] = { reason, disabledUntil: until };
  await writeDisabledMap(map);
  console.warn(`[run] Disabled source "${key}" until ${until} — ${reason}`);
}

type SourceDef = {
  key: string;
  forceEnv?: string; // e.g. "FORCE_MAGELLAN"
  run: () => Promise<any[]>;
};

async function run() {
  const sources: SourceDef[] = [
    { key: 'magellan', forceEnv: 'FORCE_MAGELLAN', run: scrapeMagellan },
    { key: 'airpartner', forceEnv: 'FORCE_AIRPARTNER', run: scrapeAirPartner },
  ];

  const allLegs: any[] = [];
  const summary: Record<string, { scraped: number; saved?: number; skipped?: number; error?: string }> = {};

  for (const src of sources) {
    const forced = src.forceEnv && process.env[src.forceEnv] === '1';
    const status = await isSourceDisabled(src.key);

    if (status.disabled && !forced) {
      console.log(
        `[run] ${src.key}: disabled until ${status.until}` +
          (status.reason ? ` — reason: ${status.reason}` : '') +
          (src.forceEnv ? ` (set ${src.forceEnv}=1 to override)` : '')
      );
      continue;
    }

    console.log(`[run] Scraping ${src.key}…`);
    try {
      const legs = await src.run();
      allLegs.push(...legs);
      summary[src.key] = { scraped: legs.length };
      console.log(`[run] ${src.key}: scraped=${legs.length}`);
    } catch (e: any) {
      const msg = e?.message || String(e);
      summary[src.key] = { scraped: 0, error: msg };
      console.error(`[run] ${src.key}: scrape failed:`, msg);

      // put the source on cooldown so your cron doesn’t hammer a broken page
      await disableSource(src.key, 45, 'scrape failed'); // 45-min cooldown
      continue;
    }
  }

  // nothing scraped -> bail early (but not an error)
  if (allLegs.length === 0) {
    console.log('[run] No legs scraped from any source. Nothing to save.');
    return;
  }

  console.log(`[run] Saving ${allLegs.length} leg(s) to DB…`);

  // ✅ Minimal normalization: coerce nullable fields to undefined
  const normalized = allLegs.map((l) => ({
    ...l,
    arrivalUtc: l?.arrivalUtc ?? undefined,
    aircraft: l?.aircraft ?? undefined,
    price: l?.price ?? undefined,
  }));

const result = await saveLegs(normalized);
console.log(`[run] Saved. added=${result.added}, updated=${result.updated}, skipped=${result.skipped}`);

// Attach save stats per source for visibility (optional)
// (We don't have per-source breakdown; leave as scraped-only or add totals)
for (const k of Object.keys(summary)) {
  if (!summary[k].error) {
    // keep as-is or enrich later when saveLegs returns per-source stats
  }
}

  console.table(summary);
}

run().catch((e) => {
  console.error('Scrape run failed:', e);
  process.exit(1);
});