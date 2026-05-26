-- Add persisted strategy definitions and execution logs.
CREATE TYPE "StrategyMode" AS ENUM ('PAPER', 'REAL');
CREATE TYPE "StrategyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED');
CREATE TYPE "StrategyType" AS ENUM ('RULES', 'ML');

CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "StrategyMode" NOT NULL DEFAULT 'PAPER',
    "status" "StrategyStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "StrategyType" NOT NULL DEFAULT 'RULES',
    "config" JSONB NOT NULL,
    "promotedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StrategyExecution" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT,
    "side" TEXT,
    "stake" DECIMAL(14,2),
    "isPaper" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrategyExecution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Strategy_userId_createdAt_idx" ON "Strategy"("userId", "createdAt");
CREATE INDEX "Strategy_mode_status_idx" ON "Strategy"("mode", "status");
CREATE INDEX "StrategyExecution_strategyId_createdAt_idx" ON "StrategyExecution"("strategyId", "createdAt");
CREATE INDEX "StrategyExecution_userId_createdAt_idx" ON "StrategyExecution"("userId", "createdAt");

ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_promotedFromId_fkey" FOREIGN KEY ("promotedFromId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StrategyExecution" ADD CONSTRAINT "StrategyExecution_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StrategyExecution" ADD CONSTRAINT "StrategyExecution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

