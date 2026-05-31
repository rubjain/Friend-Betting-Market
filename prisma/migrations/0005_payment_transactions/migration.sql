-- Persist funding activity for auditability and withdrawal review.
ALTER TYPE "LedgerSource" ADD VALUE 'WITHDRAWAL';

CREATE TYPE "PaymentTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'REFUND', 'CHARGEBACK');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELED', 'FAILED');

CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PaymentTransactionType" NOT NULL,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "BalanceCurrency" NOT NULL DEFAULT 'WITHDRAWABLE',
    "provider" TEXT NOT NULL DEFAULT 'demo-ledger',
    "providerRef" TEXT,
    "method" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentTransaction_userId_createdAt_idx" ON "PaymentTransaction"("userId", "createdAt");
CREATE INDEX "PaymentTransaction_type_status_createdAt_idx" ON "PaymentTransaction"("type", "status", "createdAt");
CREATE INDEX "PaymentTransaction_provider_providerRef_idx" ON "PaymentTransaction"("provider", "providerRef");

ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
