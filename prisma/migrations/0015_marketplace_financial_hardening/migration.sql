-- Marketplace financial hardening: relational constraints and data checks.

CREATE INDEX IF NOT EXISTS "Bet_copiedFromProfileId_placedAt_idx"
  ON "Bet"("copiedFromProfileId", "placedAt");

CREATE INDEX IF NOT EXISTS "Bet_copyTradeId_idx"
  ON "Bet"("copyTradeId");

CREATE INDEX IF NOT EXISTS "CreatorPayoutItem_invoiceId_idx"
  ON "CreatorPayoutItem"("invoiceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'CreatorPayoutItem_invoiceId_fkey'
      AND table_name = 'CreatorPayoutItem'
  ) THEN
    ALTER TABLE "CreatorPayoutItem"
      ADD CONSTRAINT "CreatorPayoutItem_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "MarketplaceInvoice"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "MarketplaceBillingPlan"
  ADD CONSTRAINT "MarketplaceBillingPlan_amountCents_nonnegative"
  CHECK ("amountCents" >= 0);

ALTER TABLE "MarketplaceInvoice"
  ADD CONSTRAINT "MarketplaceInvoice_amountDueCents_nonnegative"
  CHECK ("amountDueCents" >= 0);

ALTER TABLE "MarketplaceInvoice"
  ADD CONSTRAINT "MarketplaceInvoice_amountPaidCents_nonnegative"
  CHECK ("amountPaidCents" >= 0);

ALTER TABLE "CreatorPayout"
  ADD CONSTRAINT "CreatorPayout_grossCents_nonnegative"
  CHECK ("grossCents" >= 0);

ALTER TABLE "CreatorPayout"
  ADD CONSTRAINT "CreatorPayout_feeCents_nonnegative"
  CHECK ("feeCents" >= 0);

ALTER TABLE "CreatorPayout"
  ADD CONSTRAINT "CreatorPayout_netCents_nonnegative"
  CHECK ("netCents" >= 0);

ALTER TABLE "CreatorPayoutItem"
  ADD CONSTRAINT "CreatorPayoutItem_grossCents_nonnegative"
  CHECK ("grossCents" >= 0);

ALTER TABLE "CreatorPayoutItem"
  ADD CONSTRAINT "CreatorPayoutItem_feeCents_nonnegative"
  CHECK ("feeCents" >= 0);

ALTER TABLE "CreatorPayoutItem"
  ADD CONSTRAINT "CreatorPayoutItem_netCents_nonnegative"
  CHECK ("netCents" >= 0);
