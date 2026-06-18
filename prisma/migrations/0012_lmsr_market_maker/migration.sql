ALTER TABLE "LiquidityPool"
ADD COLUMN "liquidityParameter" DECIMAL(18,6) NOT NULL DEFAULT 100;

UPDATE "LiquidityPool"
SET
  "yesReserve" = 0,
  "noReserve" = 0,
  "invariant" = NULL,
  "feeBps" = 0;

UPDATE "Market"
SET
  "yesPrice" = 0.5,
  "noPrice" = 0.5
WHERE "id" IN (SELECT "marketId" FROM "LiquidityPool");
