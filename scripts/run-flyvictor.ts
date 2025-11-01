// scripts/run-flyvictor.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { scrapeFlyVictor } from "./sources/flyvictor";
import { saveLegs } from "./save";

// Coerce various inputs into what saveLegs / Prisma.Leg expects
function toDateOrUndef(v: any): Date | undefined {
  if (!v) return undefined;
  try {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

(async () => {
  const legs: any[] = await scrapeFlyVictor();
  console.log(`flyvictor: scraped ${legs.length} legs`);

  if (!legs.length) {
    console.log("saveLegs: nothing to save.");
    return;
  }

  // Build objects compatible with your Prisma Leg model
  // model Leg {
  //   id String @id
  //   operator String
  //   fromIata String; fromName String; fromCity String?
  //   toIata String;   toName   String; toCity   String?
  //   departAt DateTime?
  //   priceUSD Int @default(0)
  //   acType String?; acClass String?; seats Int?
  //   notes String?; fromIcao String?; toIcao String?; url String?
  //   createdAt DateTime @default(now())
  // }
  const normalized: any[] = legs.map((l) => {
    const fromIata = String(l.fromIata || "").toUpperCase();
    const toIata = String(l.toIata || "").toUpperCase();

    return {
      // required
      id: String(l.id || `${fromIata}-${toIata}-${l.departAt || ""}`),
      operator: l.operator ?? "flyvictor",
      fromIata,
      toIata,
      fromName: (l.fromName ?? fromIata)?.toString(),
      toName: (l.toName ?? toIata)?.toString(),

      // optional in schema
      fromCity: (l as any).fromCity ?? undefined,
      toCity: (l as any).toCity ?? undefined,
      departAt: toDateOrUndef(l.departAt),
      priceUSD: Number.isFinite(l.priceUSD) ? Number(l.priceUSD) : 0,
      acType: l.acType ?? undefined,
      acClass: l.acClass ?? undefined,
      seats: Number.isFinite(l.seats) ? Number(l.seats) : undefined,
      fromIcao: (l as any).fromIcao ?? undefined,
      toIcao: (l as any).toIcao ?? undefined,
      url: l.url ?? undefined,
      notes: (l as any).notes ?? undefined,
    };
  });

  // Optional: filter out any edge cases missing required fields
  const ready = normalized.filter(
    (r) => r.id && r.operator && r.fromIata && r.toIata && r.fromName && r.toName
  );

  if (ready.length !== normalized.length) {
    console.warn(
      `flyvictor: filtered out ${normalized.length - ready.length} invalid row(s) missing required fields`
    );
  }

  await saveLegs(ready);
  console.log(`flyvictor: saved ${ready.length} legs`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
