// scripts/cleanup-xo.ts
import { prisma } from "../prisma";

const IATA = /^[A-Z]{3}$/;

(async () => {
  // delete legs with missing or invalid IATA, or same origin/destination
  const bad = await prisma.leg.findMany({
    where: {
      operator: "xo",
      OR: [
        { fromIata: null }, { toIata: null },
        { fromIata: { not: { mode: "insensitive", startsWith: "" } }, NOT: [] }, // placeholder to allow OR block
      ],
    },
    select: { id: true, fromIata: true, toIata: true },
  });

  const extraBad = (await prisma.leg.findMany({
    where: { operator: "xo" },
    select: { id: true, fromIata: true, toIata: true },
  })).filter(l =>
    !l.fromIata || !l.toIata ||
    !IATA.test(l.fromIata) || !IATA.test(l.toIata) ||
    l.fromIata === l.toIata
  );

  const ids = Array.from(new Set([...bad, ...extraBad].map(x => x.id)));
  if (ids.length) {
    await prisma.leg.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted ${ids.length} low-quality XO legs`);
  } else {
    console.log("No low-quality XO legs found to delete");
  }
  process.exit(0);
})();