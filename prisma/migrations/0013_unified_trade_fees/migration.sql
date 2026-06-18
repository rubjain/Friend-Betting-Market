-- Unified paper/real trade fee accounting.

ALTER TYPE "LedgerSource" ADD VALUE IF NOT EXISTS 'PLATFORM_FEE';

ALTER TABLE "BalanceAccount"
  ADD COLUMN IF NOT EXISTS "accountMode" "AccountMode" NOT NULL DEFAULT 'REAL';

UPDATE "BalanceAccount"
SET "accountMode" = CASE WHEN "currency" = 'PAPER' THEN 'PAPER'::"AccountMode" ELSE 'REAL'::"AccountMode" END;

ALTER TABLE "Bet"
  ADD COLUMN IF NOT EXISTS "tradingMode" "AccountMode" NOT NULL DEFAULT 'REAL',
  ADD COLUMN IF NOT EXISTS "grossAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "feeAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "netAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isPaperTrade" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "feeDestination" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "realizedPnL" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unrealizedPnL" DECIMAL(14, 2) NOT NULL DEFAULT 0;

UPDATE "Bet"
SET
  "tradingMode" = CASE WHEN "isPaper" THEN 'PAPER'::"AccountMode" ELSE 'REAL'::"AccountMode" END,
  "grossAmount" = CASE WHEN "grossAmount" = 0 THEN "stake" ELSE "grossAmount" END,
  "netAmount" = CASE WHEN "netAmount" = 0 THEN GREATEST("stake" - "feeAmount", 0) ELSE "netAmount" END,
  "isPaperTrade" = "isPaper",
  "feeDestination" = CASE
    WHEN "feeAmount" <= 0 THEN 'none'
    WHEN "isPaper" THEN 'paper_burned'
    ELSE 'platform_revenue'
  END;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "tradingMode" "AccountMode" NOT NULL DEFAULT 'REAL',
  ADD COLUMN IF NOT EXISTS "grossAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "feeAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "netAmount" DECIMAL(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isPaperTrade" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "feeDestination" TEXT NOT NULL DEFAULT 'none';

UPDATE "Order"
SET
  "tradingMode" = CASE WHEN "isPaper" THEN 'PAPER'::"AccountMode" ELSE 'REAL'::"AccountMode" END,
  "isPaperTrade" = "isPaper";
