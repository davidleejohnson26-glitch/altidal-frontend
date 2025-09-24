-- CreateTable
CREATE TABLE "public"."Leg" (
    "id" TEXT NOT NULL,
    "fromIata" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "toIata" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "departAt" TIMESTAMP(3) NOT NULL,
    "priceUSD" INTEGER NOT NULL,
    "acType" TEXT NOT NULL,
    "acClass" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "operator" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Leg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Leg_fromIata_toIata_departAt_idx" ON "public"."Leg"("fromIata", "toIata", "departAt");
