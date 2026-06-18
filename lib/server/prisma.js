import { PrismaClient } from "@prisma/client";
import { agoraForceDemoMode } from "./env.js";

export function hasDatabaseUrl() {
  if (agoraForceDemoMode()) {
    return false;
  }
  return Boolean(process.env.DATABASE_URL);
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__agoraPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__agoraPrisma = prisma;
}
