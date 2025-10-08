// scripts/check-visible.ts
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient();

(async () => {
  const rows = await prisma.leg.findMany({
    where: {
      operator: 'xo',                 // now unified
      seats: { gte: 1 },
      // widen dates if your UI uses a window:
      // departAt: { gte: new Date('2025-10-01'), lt: new Date('2025-10-31') },
    },
    orderBy: { departAt: 'asc' },
    take: 20,
  });
  console.log('sample', rows.length);
  rows.forEach(r => console.log(r.id, r.fromIata, '->', r.toIata, r.departAt?.toISOString(), r.priceUSD));
  await prisma.$disconnect();
})();