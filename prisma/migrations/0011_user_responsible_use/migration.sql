-- Persist responsible-use settings on users.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dailyDepositLimit" DECIMAL(14,2);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "selfExcludedUntil" TIMESTAMP(3);
