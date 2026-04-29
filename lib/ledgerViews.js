export const ledgerFilterOptions = [
  ["all", "All"],
  ["withdrawable", "Withdrawable"],
  ["bonus", "Bonus"],
  ["social_boost", "Boosts"],
  ["admin_adjustment", "Admin"],
  ["deposit", "Deposits"],
  ["withdrawal", "Withdrawals"],
  ["referral_bonus", "Referrals"],
  ["market_payout", "Payouts"],
  ["bet_placed", "Bets"],
];

export const ledgerSortOptions = [
  ["newest", "Newest"],
  ["oldest", "Oldest"],
  ["amount_desc", "Amount high"],
  ["amount_asc", "Amount low"],
];

export function filterLedgerEntries(entries, filter = "all", userId = null) {
  return entries.filter((entry) => {
    const matchesUser = !userId || entry.user_id === userId;
    const matchesFilter =
      filter === "all" || entry.currency_type === filter || entry.source === filter;
    return matchesUser && matchesFilter;
  });
}

export function sortLedgerEntries(entries, sort = "newest") {
  return [...entries].sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    }
    if (sort === "amount_desc") {
      return Number(b.amount) - Number(a.amount);
    }
    if (sort === "amount_asc") {
      return Number(a.amount) - Number(b.amount);
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export function paginateEntries(entries, page = 1, pageSize = 8) {
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    entries: entries.slice(start, start + pageSize),
    currentPage,
    totalPages,
    totalEntries: entries.length,
    pageSize,
  };
}

export function getLedgerView({
  entries,
  filter = "all",
  sort = "newest",
  page = 1,
  pageSize = 8,
  userId = null,
}) {
  const filtered = filterLedgerEntries(entries, filter, userId);
  const sorted = sortLedgerEntries(filtered, sort);
  return paginateEntries(sorted, page, pageSize);
}
