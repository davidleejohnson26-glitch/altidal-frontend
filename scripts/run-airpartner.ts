// scripts/run-airpartner.ts
import 'dotenv/config';
import { scrapeAirPartner } from './sources/airpartner';
import { saveLegs } from './save';

(async () => {
  const legs = await scrapeAirPartner();
  console.log('[airpartner] scraped:', legs.length);

  if (!legs.length) {
    console.log('[airpartner] nothing to save.');
    return;
  }

  // Minimal normalization: null -> undefined on optional fields
  const normalized = legs.map((l) => ({
    ...l,
    arrivalUtc: l?.arrivalUtc ?? undefined,
    aircraft: l?.aircraft ?? undefined,
    price: l?.price ?? undefined,
  }));

  const res = await saveLegs(normalized);
  console.log('[airpartner] saved summary:', res);
})().catch((e) => {
  console.error('run-airpartner failed:', e);
  process.exit(1);
});