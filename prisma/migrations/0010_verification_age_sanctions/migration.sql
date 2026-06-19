-- Add age and sanctions verification types for compliance gating.
ALTER TYPE "VerificationType" ADD VALUE 'AGE';
ALTER TYPE "VerificationType" ADD VALUE 'SANCTIONS';
