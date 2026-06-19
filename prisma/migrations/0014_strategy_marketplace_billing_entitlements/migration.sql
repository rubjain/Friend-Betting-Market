-- Enterprise marketplace billing, entitlement, moderation, and payout models.

ALTER TYPE "StrategyProfileStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "StrategyProfileStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'FAILED', 'REFUNDED');
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'GRACE', 'REVOKED', 'EXPIRED');
CREATE TYPE "ModerationAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'TAKEDOWN', 'RESTORED', 'NOTE');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'READY', 'PAID', 'HELD', 'CANCELED');

CREATE TABLE "MarketplaceBillingPlan" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
    "amountCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "providerProductId" TEXT,
    "providerPriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceBillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "providerCheckoutSessionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "latestInvoiceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "billingSubscriptionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerInvoiceId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "amountDueCents" INTEGER NOT NULL DEFAULT 0,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceEntitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "billingSubscriptionId" TEXT,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" TEXT NOT NULL DEFAULT 'billing',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "graceEndsAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketplaceEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListingModerationEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" "ModerationAction" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingModerationEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorPayout" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreatorPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorPayoutItem" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "grossCents" INTEGER NOT NULL DEFAULT 0,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorPayoutItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CreatorPayoutLedgerEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorPayoutLedgerEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingSubscription_providerSubscriptionId_key" ON "BillingSubscription"("providerSubscriptionId");
CREATE UNIQUE INDEX "BillingSubscription_userId_profileId_key" ON "BillingSubscription"("userId", "profileId");
CREATE UNIQUE INDEX "MarketplaceInvoice_providerInvoiceId_key" ON "MarketplaceInvoice"("providerInvoiceId");
CREATE INDEX "MarketplaceBillingPlan_profileId_active_idx" ON "MarketplaceBillingPlan"("profileId", "active");
CREATE INDEX "BillingSubscription_profileId_status_idx" ON "BillingSubscription"("profileId", "status");
CREATE INDEX "MarketplaceInvoice_userId_createdAt_idx" ON "MarketplaceInvoice"("userId", "createdAt");
CREATE INDEX "MarketplaceInvoice_billingSubscriptionId_createdAt_idx" ON "MarketplaceInvoice"("billingSubscriptionId", "createdAt");
CREATE INDEX "MarketplaceEntitlement_userId_profileId_status_idx" ON "MarketplaceEntitlement"("userId", "profileId", "status");
CREATE INDEX "MarketplaceEntitlement_billingSubscriptionId_createdAt_idx" ON "MarketplaceEntitlement"("billingSubscriptionId", "createdAt");
CREATE INDEX "ListingModerationEvent_profileId_createdAt_idx" ON "ListingModerationEvent"("profileId", "createdAt");
CREATE INDEX "CreatorPayout_creatorId_status_periodEnd_idx" ON "CreatorPayout"("creatorId", "status", "periodEnd");
CREATE INDEX "CreatorPayoutItem_payoutId_profileId_idx" ON "CreatorPayoutItem"("payoutId", "profileId");
CREATE INDEX "CreatorPayoutLedgerEvent_profileId_createdAt_idx" ON "CreatorPayoutLedgerEvent"("profileId", "createdAt");

ALTER TABLE "MarketplaceBillingPlan"
  ADD CONSTRAINT "MarketplaceBillingPlan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MarketplaceBillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInvoice"
  ADD CONSTRAINT "MarketplaceInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInvoice"
  ADD CONSTRAINT "MarketplaceInvoice_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceInvoice"
  ADD CONSTRAINT "MarketplaceInvoice_billingSubscriptionId_fkey" FOREIGN KEY ("billingSubscriptionId") REFERENCES "BillingSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceEntitlement"
  ADD CONSTRAINT "MarketplaceEntitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceEntitlement"
  ADD CONSTRAINT "MarketplaceEntitlement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceEntitlement"
  ADD CONSTRAINT "MarketplaceEntitlement_billingSubscriptionId_fkey" FOREIGN KEY ("billingSubscriptionId") REFERENCES "BillingSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ListingModerationEvent"
  ADD CONSTRAINT "ListingModerationEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingModerationEvent"
  ADD CONSTRAINT "ListingModerationEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CreatorPayout"
  ADD CONSTRAINT "CreatorPayout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorPayoutItem"
  ADD CONSTRAINT "CreatorPayoutItem_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "CreatorPayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorPayoutItem"
  ADD CONSTRAINT "CreatorPayoutItem_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorPayoutItem"
  ADD CONSTRAINT "CreatorPayoutItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorPayoutLedgerEvent"
  ADD CONSTRAINT "CreatorPayoutLedgerEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StrategyMarketplaceProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatorPayoutLedgerEvent"
  ADD CONSTRAINT "CreatorPayoutLedgerEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
