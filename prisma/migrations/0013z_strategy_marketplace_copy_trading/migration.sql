-- CreateEnum
CREATE TYPE "AccountMode" AS ENUM ('PAPER', 'REAL');

-- CreateEnum
CREATE TYPE "StrategyProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StrategySubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CopyTradeStatus" AS ENUM ('COPIED', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "Bet" ADD COLUMN "copiedFromProfileId" TEXT,
ADD COLUMN "copyTradeId" TEXT;

-- CreateTable
CREATE TABLE "StrategyMarketplaceProfile" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "marketsSupported" TEXT[],
    "riskLevel" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "status" "StrategyProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "roiPct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "winRatePct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "maxDrawdownPct" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "copiedVolume" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyMarketplaceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategySubscription" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountMode" "AccountMode" NOT NULL DEFAULT 'PAPER',
    "status" "StrategySubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "allocationPct" DECIMAL(5,2) NOT NULL,
    "maxTradeSize" DECIMAL(14,2),
    "maxDailyLoss" DECIMAL(14,2),
    "maxOpenPositions" INTEGER,
    "allowedMarketIds" TEXT[],
    "autoCopyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategySubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyTradeSignal" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "sourceBetId" TEXT,
    "sourceExecutionId" TEXT,
    "accountMode" "AccountMode" NOT NULL DEFAULT 'PAPER',
    "marketId" TEXT NOT NULL,
    "side" "BetSide" NOT NULL,
    "sourceStake" DECIMAL(14,2) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyTradeSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopyTrade" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "accountMode" "AccountMode" NOT NULL DEFAULT 'PAPER',
    "status" "CopyTradeStatus" NOT NULL,
    "skipReason" TEXT,
    "stake" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "copiedBetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopyTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StrategyMarketplaceProfile_strategyId_key" ON "StrategyMarketplaceProfile"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyMarketplaceProfile_slug_key" ON "StrategyMarketplaceProfile"("slug");

-- CreateIndex
CREATE INDEX "StrategyMarketplaceProfile_creatorId_status_idx" ON "StrategyMarketplaceProfile"("creatorId", "status");

-- CreateIndex
CREATE INDEX "StrategyMarketplaceProfile_status_updatedAt_idx" ON "StrategyMarketplaceProfile"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "StrategySubscription_profileId_userId_accountMode_key" ON "StrategySubscription"("profileId", "userId", "accountMode");

-- CreateIndex
CREATE INDEX "StrategySubscription_userId_status_idx" ON "StrategySubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "StrategySubscription_profileId_status_idx" ON "StrategySubscription"("profileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyTradeSignal_idempotencyKey_key" ON "StrategyTradeSignal"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StrategyTradeSignal_strategyId_createdAt_idx" ON "StrategyTradeSignal"("strategyId", "createdAt");

-- CreateIndex
CREATE INDEX "StrategyTradeSignal_profileId_createdAt_idx" ON "StrategyTradeSignal"("profileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CopyTrade_signalId_subscriptionId_key" ON "CopyTrade"("signalId", "subscriptionId");

-- CreateIndex
CREATE INDEX "CopyTrade_subscriberId_createdAt_idx" ON "CopyTrade"("subscriberId", "createdAt");

-- CreateIndex
CREATE INDEX "CopyTrade_subscriptionId_createdAt_idx" ON "CopyTrade"("subscriptionId", "createdAt");

-- AddForeignKey
ALTER TABLE "StrategyMarketplaceProfile" ADD CONSTRAINT "StrategyMarketplaceProfile_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyMarketplaceProfile" ADD CONSTRAINT "StrategyMarketplaceProfile_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategySubscription" ADD CONSTRAINT "StrategySubscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategySubscription" ADD CONSTRAINT "StrategySubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyTradeSignal" ADD CONSTRAINT "StrategyTradeSignal_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyTradeSignal" ADD CONSTRAINT "StrategyTradeSignal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyTradeSignal" ADD CONSTRAINT "StrategyTradeSignal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyTrade" ADD CONSTRAINT "CopyTrade_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "StrategyTradeSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyTrade" ADD CONSTRAINT "CopyTrade_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "StrategySubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopyTrade" ADD CONSTRAINT "CopyTrade_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
