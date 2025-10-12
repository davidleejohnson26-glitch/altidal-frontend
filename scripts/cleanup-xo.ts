// scripts/cleanup-xo.ts
// @ts-check
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IATA = /^[A-Z]{3}$/;

(async () => {
  // find obvious bad XO legs
  const all = await prisma.leg.findMany({
    where: { operator: { in: ['xo', 'FlyXO'] } },
    select: { id: true, fromIata: true, toIata: true },
  });

  const badIds = all
    .filter(l =>
      !l.fromIata || !l.toIata ||
      !IATA.test(l.fromIata) || !IATA.test(l.toIata) ||
      l.fromIata === l.toIata
    )
    .map(l => l.id);

  if (badIds.length) {
    const res = await prisma.leg.deleteMany({ where: { id: { in: badIds } } });
    console.log(`Deleted ${res.count} low-quality XO legs`);
  } else {
    console.log('No low-quality XO legs found to delete');
  }

  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});