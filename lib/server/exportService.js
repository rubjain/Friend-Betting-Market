import { ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

function toNumber(value) {
  return Number(value ?? 0);
}

function lower(value) {
  return String(value || "").toLowerCase();
}

export async function buildDatabaseLedgerExportRows(client = prisma) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const entries = await client.ledgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  return entries.map((entry) => ({
    timestamp: entry.createdAt.toISOString(),
    user_id: entry.userId,
    market_id: entry.marketId ?? "",
    bet_id: entry.betId ?? "",
    transaction_type: lower(entry.transactionType),
    amount: toNumber(entry.amount),
    currency_type: lower(entry.currency),
    source: lower(entry.source),
    metadata: entry.metadata?.note ?? JSON.stringify(entry.metadata ?? {}),
  }));
}

export async function buildDatabaseRiskReviewExportRows(client = prisma) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const users = await client.user.findMany({
    where: {
      OR: [{ riskStatus: { not: "clear" } }, { riskScore: { gte: 40 } }, { frozen: true }],
    },
    include: {
      balanceAccounts: true,
      riskReviews: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
    take: 5000,
  });

  return users.map((user) => {
    const withdrawable = user.balanceAccounts.find((account) => account.currency === "WITHDRAWABLE");
    const bonus = user.balanceAccounts.find((account) => account.currency === "BONUS");
    const signals = user.riskReviews.flatMap((review) =>
      Array.isArray(review.signals) ? review.signals : [JSON.stringify(review.signals)],
    );

    return {
      user_id: user.id,
      name: user.name,
      withdrawable_balance: toNumber(withdrawable?.balance),
      bonus_balance: toNumber(bonus?.balance),
      risk_status: user.riskStatus,
      risk_score: user.riskScore,
      frozen: user.frozen ? "yes" : "no",
      risk_signals: signals.length ? signals.join("; ") : "Persisted risk status",
    };
  });
}
