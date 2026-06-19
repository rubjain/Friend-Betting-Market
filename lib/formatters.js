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
  // Date-only values ("YYYY-MM-DD") are treated as a local calendar day so that
  // "Today"/"Tomorrow" and the rendered date match the viewer's machine timezone.
  const raw = String(value);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10)) && raw.length <= 10
    ? new Date(`${raw.slice(0, 10)}T00:00:00`)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const startOfDay = (d) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  const month = new Intl.DateTimeFormat(undefined, { month: "short" }).format(date);
  // Only show year if it's not this calendar year
  const year = date.getFullYear();
  const thisYear = today.getFullYear();
  return year === thisYear ? `${month} ${date.getDate()}` : `${month} ${date.getDate()} ${year}`;
}

/**
 * Formats a timestamp into the viewer's local timezone (PST/EST/IST/etc.).
 * Uses the runtime default zone — in the browser that's the user's machine.
 * Pass { withZone: true } to append the timezone label (e.g. "EST", "GMT+5:30").
 */
export function formatDateTime(value, { withZone = false } = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const options = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  };
  if (date.getFullYear() !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  if (withZone) {
    options.timeZoneName = "short";
  }
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function titleCase(str) {
  return String(str || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
