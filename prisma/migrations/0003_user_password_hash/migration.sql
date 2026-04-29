-- Add nullable passwordHash to User for scrypt-hashed passwords.
-- Existing (demo-seeded) users have NULL and can still log in without a password in demo mode.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
