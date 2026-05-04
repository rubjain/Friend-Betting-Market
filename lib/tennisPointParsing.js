/**
 * Extract current-game point totals from ESPN tennis status copy when statistics omit them.
 * Order is **away – home** when two numeric/word tokens appear (matches typical away @ home listing).
 */

const POINT_TOKEN = "(\\d+|Love|love|LOVE|Ad|AD|Deuce)";
const POINT_PAIR = new RegExp(`${POINT_TOKEN}\\s*[-–]\\s*${POINT_TOKEN}`, "i");

export function normalizePointDisplayToken(raw) {
  const s = String(raw ?? "").trim();
  if (/^love$/i.test(s)) {
    return "Love";
  }
  if (/^ad$/i.test(s)) {
    return "AD";
  }
  if (/^deuce$/i.test(s)) {
    return "Deuce";
  }
  return s;
}

/**
 * @returns {{ away: string, home: string } | null}
 */
export function parseGamePointsFromStatusText(detail, shortDetail) {
  const blob = `${detail ?? ""} ${shortDetail ?? ""}`.trim();
  if (!blob) {
    return null;
  }

  const paren = blob.match(/\(\s*([^)]+)\s*\)/);
  if (paren) {
    const inner = paren[1].trim();
    const m = inner.match(new RegExp(`^${POINT_TOKEN}\\s*[-–]\\s*${POINT_TOKEN}$`, "i"));
    if (m) {
      return {
        away: normalizePointDisplayToken(m[1]),
        home: normalizePointDisplayToken(m[2]),
      };
    }
  }

  const m = blob.match(POINT_PAIR);
  if (m) {
    return {
      away: normalizePointDisplayToken(m[1]),
      home: normalizePointDisplayToken(m[2]),
    };
  }

  if (/\bdeuce\b/i.test(blob) && !POINT_PAIR.test(blob)) {
    return { away: "40", home: "40" };
  }

  return null;
}

/**
 * Oldest → newest for reading order (desk fallbacks use `desk-{i}` with 0 = newest line in typical feeds).
 */
export function sortTennisPointHistory(plays) {
  if (!Array.isArray(plays) || plays.length <= 1) {
    return plays ?? [];
  }
  return [...plays].sort((a, b) => {
    const da = /^desk-(\d+)$/.exec(String(a.id ?? ""));
    const db = /^desk-(\d+)$/.exec(String(b.id ?? ""));
    if (da && db) {
      return Number(db[1]) - Number(da[1]);
    }
    const sa = Number(a.sequenceNumber ?? 0);
    const sb = Number(b.sequenceNumber ?? 0);
    if (sa !== sb) {
      return sa - sb;
    }
    return (Date.parse(a.wallclock || "") || 0) - (Date.parse(b.wallclock || "") || 0);
  });
}
