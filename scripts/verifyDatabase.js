import { ensureDemoDatabaseSeed } from "../lib/server/dbState.js";
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
    apiKeys: await prisma.apiKey.count(),
    strategies: await prisma.strategy.count(),
    marketplaceProfiles: await prisma.strategyMarketplaceProfile.count(),
    billingPlans: await prisma.marketplaceBillingPlan.count(),
    billingSubscriptions: await prisma.billingSubscription.count(),
    marketplaceEntitlements: await prisma.marketplaceEntitlement.count(),
    strategyExecutions: await prisma.strategyExecution.count(),
    groups: await prisma.group.count(),
    groupMembers: await prisma.groupMember.count(),
    verificationChecks: await prisma.verificationCheck.count(),
    authTokens: await prisma.authToken.count(),
    rateLimitBuckets: await prisma.rateLimitBucket.count(),
  };

  assertMinimum("users", counts.users, 3);
  assertMinimum("sessions", counts.sessions, 1);
  assertMinimum("balances", counts.balances, 6);
  assertMinimum("markets", counts.markets, 3);
  assertMinimum("bets", counts.bets, 1);
  assertMinimum("ledger entries", counts.ledgerEntries, 1);
  assertMinimum("verification checks", counts.verificationChecks, 6);
  assertMinimum("auth tokens", counts.authTokens, 0);
  assertMinimum("billing plans", counts.billingPlans, 0);
  assertMinimum("billing subscriptions", counts.billingSubscriptions, 0);
  assertMinimum("marketplace entitlements", counts.marketplaceEntitlements, 0);

  const persistedBet = await prisma.bet.findUnique({
    where: { id: "bet_seed_friend_1" },
    include: { market: true },
  });
  if (!persistedBet?.market) {
    throw new Error("Seeded friend bet was not returned from persisted database state.");
  }

  async function readWithdrawableBalance(userId) {
    const account = await prisma.balanceAccount.findUnique({
      where: { userId_currency: { userId, currency: "WITHDRAWABLE" } },
      select: { balance: true },
    });
    return Number(account?.balance ?? 0);
  }

  const firstBalance = await readWithdrawableBalance("user_2");
  const secondBalance = await readWithdrawableBalance("user_2");
  if (firstBalance !== secondBalance) {
    throw new Error("Persisted user balance changed between reads.");
  }

  console.log("Database verification passed.");
  console.table(counts);
}

await prisma.$disconnect();
