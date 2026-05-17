import { ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

const ledgerCurrencyFilters = new Map([
  ["withdrawable", "WITHDRAWABLE"],
  ["bonus", "BONUS"],
]);

const ledgerSourceFilters = new Map([
  ["social_boost", "SOCIAL_BOOST"],
  ["admin_adjustment", "ADMIN_ADJUSTMENT"],
  ["deposit", "DEPOSIT"],
  ["withdrawal", "WITHDRAWAL"],
  ["market_payout", "MARKET_PAYOUT"],
  ["bet_placed", "BET_PLACED"],
  ["refund", "REFUND"],
  ["void", "VOID"],
]);

function toNumber(value) {
  return Number(value ?? 0);
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function ledgerOrderBy(sort) {
  if (sort === "oldest") return { createdAt: "asc" };
  if (sort === "amount_desc") return { amount: "desc" };
  if (sort === "amount_asc") return { amount: "asc" };
  return { createdAt: "desc" };
}

export function buildLedgerExportWhere(filter = "all") {
  if (ledgerCurrencyFilters.has(filter)) {
    return { currency: ledgerCurrencyFilters.get(filter) };
  }
  if (ledgerSourceFilters.has(filter)) {
    return { source: ledgerSourceFilters.get(filter) };
  }
  return {};
}

export async function buildDatabaseLedgerExportRows({ filter = "all", sort = "newest", client = prisma } = {}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const entries = await client.ledgerEntry.findMany({
    where: buildLedgerExportWhere(filter),
    orderBy: ledgerOrderBy(sort),
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
