export function money(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function signedMoney(entry) {
  const prefix = entry.transaction_type === "debit" ? "-" : "+";
  return `${prefix}${money(entry.amount)}`;
}

export function formatVolume(amount) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function formatMarketDate(value) {
  if (!value) return "Not set";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  const todayUTC = new Date();
  todayUTC.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - todayUTC.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(date);
  // Only show year if it's not this calendar year
  const year = date.getUTCFullYear();
  const thisYear = new Date().getUTCFullYear();
  return year === thisYear ? `${month} ${date.getUTCDate()}` : `${month} ${date.getUTCDate()} ${year}`;
}

export function titleCase(str) {
  return String(str || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
