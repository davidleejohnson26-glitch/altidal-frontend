// scripts/run-flyvictor.ts
import { scrapeFlyVictor } from "./sources/flyvictor";
import { saveLegs } from "./save";

(async () => {
  const legs = await scrapeFlyVictor();
  console.log(`flyvictor: scraped ${legs.length} legs`);

  if (!legs.length) {
    console.log("saveLegs: nothing to save.");
    return;
  }

  // Minimal normalization: coerce nullable -> undefined and ensure defaults
  const normalized = legs.map((l) => ({
    ...l,
    // core fields:
    operator: l.operator ?? "flyvictor",
    departAt: l.departAt ?? undefined,
    priceUSD: l.priceUSD ?? 0,

    // optional metadata:
    acType: l.acType ?? undefined,
    acClass: l.acClass ?? undefined,
    seats: l.seats ?? undefined,
    fromCity: (l as any).fromCity ?? undefined,
    toCity: (l as any).toCity ?? undefined,
    fromIcao: (l as any).fromIcao ?? undefined,
    toIcao: (l as any).toIcao ?? undefined,
    url: l.url ?? undefined,
    notes: (l as any).notes ?? undefined,
  }));

  await saveLegs(normalized);
  console.log(`flyvictor: saved ${normalized.length} legs`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
