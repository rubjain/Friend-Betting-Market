import { getLedgerView } from "../ledgerViews.js";
import { ensureDemoDatabaseSeed } from "./dbState.js";
import { getDemoState } from "./demoStore.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

const currencyFilters = new Map([
  ["withdrawable", "WITHDRAWABLE"],
  ["bonus", "BONUS"],
]);

const sourceFilters = new Map([
  ["social_boost", "SOCIAL_BOOST"],
  ["admin_adjustment", "ADMIN_ADJUSTMENT"],
  ["deposit", "DEPOSIT"],
  ["market_payout", "MARKET_PAYOUT"],
  ["bet_placed", "BET_PLACED"],
  ["refund", "REFUND"],
  ["void", "VOID"],
]);

function asPositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
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

function ledgerWhere(filter) {
  if (currencyFilters.has(filter)) {
    return { currency: currencyFilters.get(filter) };
  }
  if (sourceFilters.has(filter)) {
    return { source: sourceFilters.get(filter) };
  }
  return {};
}

function mapLedgerEntry(entry) {
  return {
    id: entry.id,
    timestamp: entry.createdAt.toISOString(),
    user_id: entry.userId,
    market_id: entry.marketId ?? "",
    bet_id: entry.betId ?? "",
    transaction_type: lower(entry.transactionType),
    amount: Number(entry.amount ?? 0),
    currency_type: lower(entry.currency),
    source: lower(entry.source),
    metadata: entry.metadata?.note ?? entry.metadata ?? "",
  };
}

function mapAuditEntry(entry) {
  return {
    id: entry.id,
    timestamp: entry.createdAt.toISOString(),
    actor_id: entry.actorId ?? "",
    actor_name: entry.actor?.name ?? "",
    market_id: entry.marketId ?? "",
    market_title: entry.market?.title ?? "",
    action: entry.action,
    metadata: entry.metadata ?? {},
  };
}

function mapDispute(dispute) {
  return {
    id: dispute.id,
    market_id: dispute.marketId,
    market_title: dispute.market.title,
    user_id: dispute.userId,
    user_name: dispute.user.name,
    bet_id: dispute.betId ?? "",
    status: lower(dispute.status),
    reason: dispute.reason,
    created_at: dispute.createdAt.toISOString(),
  };
}

export async function getAdminLedgerPage({ filter = "all", sort = "newest", page = 1, pageSize = 8 } = {}) {
  const currentPage = asPositiveInt(page, 1);
  const size = Math.min(asPositiveInt(pageSize, 8), 100);

  if (!hasDatabaseUrl()) {
    return getLedgerView({
      entries: getDemoState().ledger,
      filter,
      sort,
      page: currentPage,
      pageSize: size,
    });
  }

  await ensureDemoDatabaseSeed(prisma);
  const where = ledgerWhere(filter);
  const totalEntries = await prisma.ledgerEntry.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalEntries / size));
  const boundedPage = Math.min(currentPage, totalPages);
  const entries = await prisma.ledgerEntry.findMany({
    where,
    orderBy: ledgerOrderBy(sort),
    skip: (boundedPage - 1) * size,
    take: size,
  });

  return {
    entries: entries.map(mapLedgerEntry),
    currentPage: boundedPage,
    totalPages,
    totalEntries,
    pageSize: size,
  };
}

export async function getAdminAuditPage({ action = "all", page = 1, pageSize = 20 } = {}) {
  const currentPage = asPositiveInt(page, 1);
  const size = Math.min(asPositiveInt(pageSize, 20), 100);

  if (!hasDatabaseUrl()) {
    return {
      entries: [],
      currentPage: 1,
      totalPages: 1,
      totalEntries: 0,
      pageSize: size,
    };
  }

  await ensureDemoDatabaseSeed(prisma);
  const where = action === "all" ? {} : { action };
  const totalEntries = await prisma.auditTrail.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalEntries / size));
  const boundedPage = Math.min(currentPage, totalPages);
  const entries = await prisma.auditTrail.findMany({
    where,
    include: { actor: true, market: true },
    orderBy: { createdAt: "desc" },
    skip: (boundedPage - 1) * size,
    take: size,
  });

  return {
    entries: entries.map(mapAuditEntry),
    currentPage: boundedPage,
    totalPages,
    totalEntries,
    pageSize: size,
  };
}

export async function getAdminDisputePage({ status = "open", page = 1, pageSize = 20 } = {}) {
  const currentPage = asPositiveInt(page, 1);
  const size = Math.min(asPositiveInt(pageSize, 20), 100);

  if (!hasDatabaseUrl()) {
    return {
      entries: [],
      currentPage: 1,
      totalPages: 1,
      totalEntries: 0,
      pageSize: size,
    };
  }

  await ensureDemoDatabaseSeed(prisma);
  const normalized = String(status || "open").toUpperCase();
  const where = normalized === "ALL" ? {} : { status: normalized };
  const totalEntries = await prisma.marketDispute.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalEntries / size));
  const boundedPage = Math.min(currentPage, totalPages);
  const entries = await prisma.marketDispute.findMany({
    where,
    include: { market: true, user: true },
    orderBy: { createdAt: "desc" },
    skip: (boundedPage - 1) * size,
    take: size,
  });

  return {
    entries: entries.map(mapDispute),
    currentPage: boundedPage,
    totalPages,
    totalEntries,
    pageSize: size,
  };
}
