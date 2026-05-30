/**
 * Tennis win-probability from ESPN ATP/WTA rankings.
 *
 * ESPN publishes live rankings at:
 *   site.api.espn.com/apis/site/v2/sports/tennis/{atp|wta}/rankings
 *
 * We cache them for 12 hours (rankings update weekly; daily refresh is plenty).
 * When a player isn't in the top 150, we estimate their points via a power-law
 * decay that closely matches the real ATP/WTA point distributions.
 *
 * Win-probability formula: P(away wins) = away_pts / (away_pts + home_pts)
 * This is the "market share" model — fast, parameter-free, and closely tracks
 * Elo-derived probabilities for most matchups.
 */

const RANKINGS_TTL = 12 * 60 * 60 * 1000; // 12 hours

const cache = {
  atp: { map: new Map(), fetchedAt: 0 },
  wta: { map: new Map(), fetchedAt: 0 },
};

/**
 * Approximate ranking points for players outside ESPN's top-150 list.
 * Derived from the actual ATP/WTA point distributions (roughly power-law).
 */
function estimatePointsForRank(rank) {
  if (rank <= 150) return 400;   // bottom of top-150, approximate
  if (rank <= 200) return 275;
  if (rank <= 250) return 200;
  if (rank <= 300) return 155;
  if (rank <= 400) return 100;
  if (rank <= 500) return 65;
  return 35;                      // qualifier / low-ranked player
}

async function fetchRankings(tour) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/rankings`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return new Map();
    const data = await res.json();
    const ranks = data.rankings?.[0]?.ranks ?? [];
    const map = new Map();
    for (const r of ranks) {
      const name = r.athlete?.displayName;
      if (!name) continue;
      // Store both full name and "Last, First" variant for matching flexibility
      const key = name.toLowerCase().trim();
      const entry = { rank: r.current ?? 999, points: r.points ?? estimatePointsForRank(r.current ?? 999) };
      map.set(key, entry);
      // Also index by last name alone for partial-match fallback
      const lastName = name.split(" ").pop()?.toLowerCase();
      if (lastName && !map.has(lastName)) {
        map.set(lastName, entry);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

async function getRankings(tour) {
  const entry = cache[tour];
  const now = Date.now();
  if (now - entry.fetchedAt < RANKINGS_TTL && entry.map.size > 0) {
    return entry.map;
  }
  const map = await fetchRankings(tour);
  if (map.size > 0) {
    entry.map = map;
    entry.fetchedAt = now;
  }
  return entry.map.size > 0 ? entry.map : new Map();
}

export const getAtpRankings = () => getRankings("atp");
export const getWtaRankings = () => getRankings("wta");

/**
 * Look up a player in the rankings map. Tries full name, then last name.
 * Returns { rank, points } or a default for unknown players.
 */
function lookupPlayer(name, map) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  if (map.has(normalized)) return map.get(normalized);
  // Try last name only (ESPN scoreboard sometimes uses short names)
  const lastName = normalized.split(" ").pop();
  if (lastName && map.has(lastName)) return map.get(lastName);
  return null;
}

/**
 * Compute { yesPrice, noPrice } for a tennis match using ranking points.
 *
 * Convention matches the rest of Agora game markets:
 *   YES = away player wins
 *   NO  = home player wins
 *
 * @param {string} awayName  - display name of the away player
 * @param {string} homeName  - display name of the home player
 * @param {Map}    rankingsMap - from getAtpRankings() or getWtaRankings()
 * @returns {{ yesPrice: number, noPrice: number }}
 */
/**
 * Probability floors/ceilings. Tennis upsets happen — never show 99%+ or 1%-.
 * Mirrors typical sportsbook pricing where even rank 1 vs qualifier is ~93% max.
 */
const MIN_WIN_PROB = 0.07;
const MAX_WIN_PROB = 0.93;

export function tennisPricesFromRankings(awayName, homeName, rankingsMap) {
  const awayEntry = lookupPlayer(awayName, rankingsMap);
  const homeEntry = lookupPlayer(homeName, rankingsMap);

  // If neither player is ranked, return 50/50
  if (!awayEntry && !homeEntry) {
    return { yesPrice: 0.5, noPrice: 0.5 };
  }

  const awayPts = awayEntry?.points ?? estimatePointsForRank(500);
  const homePts = homeEntry?.points ?? estimatePointsForRank(500);
  const total = awayPts + homePts;

  const rawProb = awayPts / total;
  // Clamp to [MIN, MAX] — no market should ever be sub-7% or above 93%
  const yesPrice = parseFloat(
    Math.min(MAX_WIN_PROB, Math.max(MIN_WIN_PROB, rawProb)).toFixed(4)
  );
  const noPrice = parseFloat((1 - yesPrice).toFixed(4));

  return { yesPrice, noPrice };
}

/**
 * Determine whether a tennis game is ATP or WTA from the game's league string.
 */
export function isTourAtp(game) {
  const league = String(game?.league ?? game?.id ?? "").toLowerCase();
  return league.includes("atp") || (!league.includes("wta") && game?.id?.includes("_atp_"));
}
