-- Sync schema.prisma with migrations: paper trading, groups, comments, market metadata.

-- BalanceCurrency.PAPER
ALTER TYPE "BalanceCurrency" ADD VALUE IF NOT EXISTS 'PAPER';

-- MarketStatus extra values
ALTER TYPE "MarketStatus" ADD VALUE IF NOT EXISTS 'OPEN';
ALTER TYPE "MarketStatus" ADD VALUE IF NOT EXISTS 'CLOSED';
ALTER TYPE "MarketStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Market metadata enums and columns
DO $$ BEGIN
  CREATE TYPE "MarketOutcomeType" AS ENUM ('BINARY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MarketCreatedBy" AS ENUM ('SYSTEM', 'ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "closeTime" TIMESTAMP(3);
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "createdBy" "MarketCreatedBy" NOT NULL DEFAULT 'USER';
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "externalSourceId" TEXT;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "externalSourceName" TEXT;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "normalizedQuestion" TEXT;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "outcomeType" "MarketOutcomeType" NOT NULL DEFAULT 'BINARY';
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "question" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "resolutionRules" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "resolutionSource" TEXT;
ALTER TABLE "Market" ADD COLUMN IF NOT EXISTS "resolutionTime" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Market_externalSourceName_externalSourceId_key"
  ON "Market"("externalSourceName", "externalSourceId");
CREATE INDEX IF NOT EXISTS "Market_status_createdAt_idx" ON "Market"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Market_normalizedQuestion_idx" ON "Market"("normalizedQuestion");

-- Paper trading on bets and orders
ALTER TABLE "Bet" ADD COLUMN IF NOT EXISTS "isPaper" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "isPaper" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- Social groups
CREATE TABLE IF NOT EXISTS "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Group_inviteCode_key" ON "Group"("inviteCode");
CREATE INDEX IF NOT EXISTS "Group_ownerId_idx" ON "Group"("ownerId");
CREATE UNIQUE INDEX IF NOT EXISTS "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");
CREATE INDEX IF NOT EXISTS "GroupMember_userId_idx" ON "GroupMember"("userId");

ALTER TABLE "Group" DROP CONSTRAINT IF EXISTS "Group_ownerId_fkey";
ALTER TABLE "Group" ADD CONSTRAINT "Group_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GroupMember" DROP CONSTRAINT IF EXISTS "GroupMember_groupId_fkey";
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GroupMember" DROP CONSTRAINT IF EXISTS "GroupMember_userId_fkey";
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Market comments
CREATE TABLE IF NOT EXISTS "MarketComment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketComment_marketId_createdAt_idx" ON "MarketComment"("marketId", "createdAt");
CREATE INDEX IF NOT EXISTS "MarketComment_userId_createdAt_idx" ON "MarketComment"("userId", "createdAt");

ALTER TABLE "MarketComment" DROP CONSTRAINT IF EXISTS "MarketComment_marketId_fkey";
ALTER TABLE "MarketComment" ADD CONSTRAINT "MarketComment_marketId_fkey"
  FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketComment" DROP CONSTRAINT IF EXISTS "MarketComment_userId_fkey";
ALTER TABLE "MarketComment" ADD CONSTRAINT "MarketComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
