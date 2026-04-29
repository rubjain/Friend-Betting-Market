export function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows, columns) {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column.key])).join(","),
  );
  return [header, ...body].join("\n");
}

export function buildLedgerExportRows(ledger) {
  return ledger.map((entry) => ({
    timestamp: entry.timestamp,
    user_id: entry.user_id,
    market_id: entry.market_id ?? "",
    bet_id: entry.bet_id ?? "",
    transaction_type: entry.transaction_type,
    amount: entry.amount,
    currency_type: entry.currency_type,
    source: entry.source,
    metadata: entry.metadata,
  }));
}

export function buildRiskReviewExportRows(users) {
  return users.map((user) => ({
    user_id: user.id,
    name: user.name,
    withdrawable_balance: user.withdrawable_balance,
    bonus_balance: user.bonus_balance,
    risk_status: user.risk_status,
    risk_score: user.risk_score,
    frozen: user.frozen ? "yes" : "no",
    risk_signals: user.risk_signals.join("; "),
  }));
}

export const ledgerExportColumns = [
  { key: "timestamp", label: "Timestamp" },
  { key: "user_id", label: "User ID" },
  { key: "market_id", label: "Market ID" },
  { key: "bet_id", label: "Bet ID" },
  { key: "transaction_type", label: "Transaction Type" },
  { key: "amount", label: "Amount" },
  { key: "currency_type", label: "Currency Type" },
  { key: "source", label: "Source" },
  { key: "metadata", label: "Metadata" },
];

export const riskReviewExportColumns = [
  { key: "user_id", label: "User ID" },
  { key: "name", label: "Name" },
  { key: "withdrawable_balance", label: "Withdrawable Balance" },
  { key: "bonus_balance", label: "Bonus Balance" },
  { key: "risk_status", label: "Risk Status" },
  { key: "risk_score", label: "Risk Score" },
  { key: "frozen", label: "Frozen" },
  { key: "risk_signals", label: "Risk Signals" },
];
