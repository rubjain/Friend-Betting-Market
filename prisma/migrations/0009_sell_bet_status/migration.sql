-- Add SOLD status for user-initiated position closes
ALTER TYPE "BetStatus" ADD VALUE IF NOT EXISTS 'SOLD';
