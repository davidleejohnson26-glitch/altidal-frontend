// scripts/run-airpartner.ts
import 'dotenv/config';
import { scrapeAirPartner } from './sources/airpartner';
import { saveLegs } from './save';

(async () => {
  const legs = await scrapeAirPartner();
  console.log('[airpartner] scraped:', legs.length);
  const res = await saveLegs(legs as any);
  console.log('[airpartner] saved summary:', res);
})().catch((e) => {
  console.error('run-airpartner failed:', e);
  process.exit(1);
});