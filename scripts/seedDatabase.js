import { ensureDemoDatabaseSeed } from "../lib/server/dbState.js";
import { hasDatabaseUrl, prisma } from "../lib/server/prisma.js";

if (!hasDatabaseUrl()) {
  console.error("DATABASE_URL is required to seed the PostgreSQL database.");
  process.exitCode = 1;
} else {
  await ensureDemoDatabaseSeed();
  const [users, markets, bets, sessions] = await Promise.all([
    prisma.user.count(),
    prisma.market.count(),
    prisma.bet.count(),
    prisma.userSession.count(),
  ]);
  console.log(`Seed complete: ${users} users, ${markets} markets, ${bets} bets, ${sessions} sessions.`);
}

await prisma.$disconnect();
