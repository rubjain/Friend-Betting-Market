import { PrismaClient } from "@prisma/client";

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__friendMarketPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__friendMarketPrisma = prisma;
}
