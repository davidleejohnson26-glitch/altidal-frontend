// scripts/run-xo.ts
import { scrapeXO } from "./sources/xo";
import { saveLegs } from "./save"; // your existing save

(async () => {
  const legs = await scrapeXO();
  console.log(`xo: scraped ${legs.length} legs`);

  if (!legs.length) {
    console.log("saveLegs: nothing to save.");
    return;
  }

  // Minimal normalization: coerce nullable -> undefined
  const normalized = legs.map((l) => ({
    ...l,
    arrivalUtc: l.arrivalUtc ?? undefined,
    aircraft: l.aircraft ?? undefined,
    price: l.price ?? undefined,
  }));

  await saveLegs(normalized);
  console.log(`xo: saved ${normalized.length} legs`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});