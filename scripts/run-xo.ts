// scripts/run-xo.ts
import { scrapeXO } from "./sources/xo";
import { saveLegs } from "./save"; // your existing save

(async () => {
  const legs = await scrapeXO();
  console.log(`xo: scraped ${legs.length} legs`);
  if (legs.length) {
    await saveLegs(legs);
    console.log(`xo: saved ${legs.length} legs`);
  } else {
    console.log("saveLegs: nothing to save.");
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});