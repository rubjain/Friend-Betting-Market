import { ensureDemoDatabaseSeed, getDatabaseState } from "../lib/server/dbState.js";
import { hasDatabaseUrl, prisma } from "../lib/server/prisma.js";

function assertMinimum(name, value, minimum) {
  if (value < minimum) {
    throw new Error(`${name} expected at least ${minimum}, found ${value}.`);
  }
}

if (!hasDatabaseUrl()) {
  console.error("DATABASE_URL is required for database verification.");
  process.exitCode = 1;
} else {
  await ensureDemoDatabaseSeed();

  const counts = {
    users: await prisma.user.count(),
    sessions: await prisma.userSession.count(),
    balances: await prisma.balanceAccount.count(),
    markets: await prisma.market.count(),
    bets: await prisma.bet.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
  };

  assertMinimum("users", counts.users, 3);
  assertMinimum("sessions", counts.sessions, 1);
  assertMinimum("balances", counts.balances, 6);
  assertMinimum("markets", counts.markets, 3);
  assertMinimum("bets", counts.bets, 1);
  assertMinimum("ledger entries", counts.ledgerEntries, 1);

  const firstState = await getDatabaseState(prisma, "user_2");
  const secondState = await getDatabaseState(prisma, "user_2");
  const persistedBet = secondState.portfolio.openBets.find((bet) => bet.id === "bet_seed_friend_1");

  if (!persistedBet) {
    throw new Error("Seeded friend bet was not returned from persisted database state.");
  }
  if (firstState.currentUser.withdrawable_balance !== secondState.currentUser.withdrawable_balance) {
    throw new Error("Persisted user balance changed between reads.");
  }

  console.log("Database verification passed.");
  console.table(counts);
}

await prisma.$disconnect();
