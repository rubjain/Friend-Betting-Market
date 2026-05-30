/**
 * The Odds API client for real bookmaker H2H odds.
 *
 * API docs: https://the-odds-api.com/liveapi/guides/v4/
 * Free tier: 500 requests/month.
 *
 * We cache each sport independently for 6 hours — at one fetch per sport per
 * 6 hours the math works out to ~360 requests/month with 2 active sports,
 * well inside the free tier.
 *
 * Return format: Map<normalizedTeamPairKey, { yesPrice, noPrice }>
 * Key format: `${awayName.toLowerCase()}|${homeName.toLowerCase()}`
 * "YES = away wins" convention matches the rest of Agora game markets.
 *
 * We also build a secondary index keyed by just the away player/team name so
 * ESPN name mismatches (short names, no accents, etc.) can fall back to a
 * last-name or partial lookup.
 */

// Read lazily so Next.js env loading (which happens before request handlers) is
// always complete before we make our first fetch.
const getApiKey = () => process.env.ODDS_API_KEY ?? "";
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Active tennis sport keys on The Odds API.
 * We fetch all of them and merge into one lookup map so callers don't need
 * to know which tournament a player is in.
 */
const TENNIS_SPORT_KEYS = [
  "tennis_atp_french_open",
  "tennis_wta_french_open",
  "tennis_atp_wimbledon",
  "tennis_wta_wimbledon",
  "tennis_atp_us_open",
  "tennis_wta_us_open",
  "tennis_atp_aus_open",
  "tennis_wta_aus_open",
  // Masters / WTA 1000 events (only active ones are billed)
  "tennis_atp",
  "tennis_wta",
];

const MLB_SPORT_KEY = "baseball_mlb";

// Per-sport cache: sportKey → { map: Map, fetchedAt: number }
const _cache = new Map();

function getCache(sportKey) {
  if (!_cache.has(sportKey)) {
    _cache.set(sportKey, { map: new Map(), fetchedAt: 0 });
  }
  return _cache.get(sportKey);
}

// ---------------------------------------------------------------------------
// Odds math — identical to espnMarketSync.js but self-contained here
// ---------------------------------------------------------------------------

function americanToProb(line) {
  if (line > 0) return 100 / (line + 100);
  return Math.abs(line) / (Math.abs(line) + 100);
}

/**
 * Average implied probabilities across all bookmakers for an event,
 * then vig-remove and return { yesPrice, noPrice }.
 *
 * YES = away team/player wins.
 * homeName / awayName must match the outcome "name" fields.
 */
function derivePrice(event) {
  const homeName = event.home_team;
  const awayName = event.away_team;

  let homeSum = 0;
  let awaySum = 0;
  let count = 0;

  for (const bk of event.bookmakers ?? []) {
    const market = bk.markets?.find((m) => m.key === "h2h");
    if (!market) continue;
    const homeOutcome = market.outcomes.find((o) => o.name === homeName);
    const awayOutcome = market.outcomes.find((o) => o.name === awayName);
    if (!homeOutcome || !awayOutcome) continue;
    const hp = americanToProb(homeOutcome.price);
    const ap = americanToProb(awayOutcome.price);
    if (!Number.isFinite(hp) || !Number.isFinite(ap)) continue;
    homeSum += hp;
    awaySum += ap;
    count++;
  }

  if (count === 0) return null;

  const homeProb = homeSum / count;
  const awayProb = awaySum / count;
  const total = homeProb + awayProb; // > 1.0 due to vig

  // Clamp to avoid sub-5% or above 95% prices
  const raw = awayProb / total;
  const clamped = Math.min(0.95, Math.max(0.05, raw));

  return {
    yesPrice: parseFloat(clamped.toFixed(4)),
    noPrice: parseFloat((1 - clamped).toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// Normalisation helpers for fuzzy name matching
// ---------------------------------------------------------------------------

/** Lower-case, strip accents, collapse whitespace */
function normName(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lastName(fullName) {
  const parts = normName(fullName).split(" ");
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------------------
// Fetch + build map for a single sport key
// ---------------------------------------------------------------------------

async function fetchSportOdds(sportKey) {
  const apiKey = getApiKey();
  if (!apiKey) return new Map();

  const url =
    `${ODDS_API_BASE}/sports/${sportKey}/odds` +
    `?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    // 422 = sport key doesn't exist / no active season — skip silently
    if (res.status === 422 || res.status === 404) return new Map();
    if (!res.ok) return new Map();

    const events = await res.json();
    if (!Array.isArray(events)) return new Map();

    const map = new Map();

    for (const event of events) {
      const prices = derivePrice(event);
      if (!prices) continue;

      const homeNorm = normName(event.home_team);
      const awayNorm = normName(event.away_team);

      // Primary key: "away|home"
      map.set(`${awayNorm}|${homeNorm}`, prices);

      // Secondary keys: just away name and just home name (for partial fallback)
      if (!map.has(`away:${awayNorm}`)) map.set(`away:${awayNorm}`, prices);
      if (!map.has(`home:${homeNorm}`)) map.set(`home:${homeNorm}`, { yesPrice: prices.noPrice, noPrice: prices.yesPrice });

      // Last-name fallbacks
      const awayLast = lastName(event.away_team);
      const homeLast = lastName(event.home_team);
      if (awayLast && !map.has(`away:${awayLast}`)) map.set(`away:${awayLast}`, prices);
      if (homeLast && !map.has(`home:${homeLast}`)) map.set(`home:${homeLast}`, { yesPrice: prices.noPrice, noPrice: prices.yesPrice });
    }

    return map;
  } catch {
    return new Map();
  }
}

async function getSportMap(sportKey) {
  const entry = getCache(sportKey);
  const now = Date.now();
  if (now - entry.fetchedAt < CACHE_TTL_MS && entry.map.size > 0) {
    return entry.map;
  }
  const map = await fetchSportOdds(sportKey);
  if (map.size > 0) {
    entry.map = map;
    entry.fetchedAt = now;
  }
  return entry.map;
}

// ---------------------------------------------------------------------------
// Merged tennis map (all active tournaments combined)
// ---------------------------------------------------------------------------

let _tennisCombined = { map: new Map(), fetchedAt: 0 };

export async function getTennisOddsMap() {
  const now = Date.now();
  if (now - _tennisCombined.fetchedAt < CACHE_TTL_MS && _tennisCombined.map.size > 0) {
    return _tennisCombined.map;
  }

  // Fetch all keys in parallel — 422s for off-season keys are swallowed
  const maps = await Promise.all(TENNIS_SPORT_KEYS.map(getSportMap));
  const merged = new Map();
  for (const m of maps) {
    for (const [k, v] of m) merged.set(k, v);
  }

  if (merged.size > 0) {
    _tennisCombined = { map: merged, fetchedAt: now };
  }
  return merged;
}

export async function getMlbOddsMap() {
  return getSportMap(MLB_SPORT_KEY);
}

// ---------------------------------------------------------------------------
// Main lookup — used by espnMarketSync.js
// ---------------------------------------------------------------------------

/**
 * Look up prices for a matchup from a pre-fetched odds map.
 * Tries: full "away|home" key, then last-name fallbacks.
 * Returns { yesPrice, noPrice } or null if not found.
 *
 * @param {string} awayName  ESPN display name of away player/team
 * @param {string} homeName  ESPN display name of home player/team
 * @param {Map}    oddsMap   from getTennisOddsMap() or getMlbOddsMap()
 */
export function lookupOddsPrices(awayName, homeName, oddsMap) {
  if (!oddsMap || oddsMap.size === 0) return null;

  const awayNorm = normName(awayName);
  const homeNorm = normName(homeName);

  // 1. Exact pair match
  const pair = oddsMap.get(`${awayNorm}|${homeNorm}`);
  if (pair) return pair;

  // 2. Reversed pair — swap yesPrice/noPrice
  const reversed = oddsMap.get(`${homeNorm}|${awayNorm}`);
  if (reversed) {
    return { yesPrice: reversed.noPrice, noPrice: reversed.yesPrice };
  }

  // 3. Away last-name only
  const awayLast = lastName(awayName);
  const awayByLast = oddsMap.get(`away:${awayLast}`);
  if (awayByLast) return awayByLast;

  // 4. Home last-name only (flip prices since we found via home)
  const homeLast = lastName(homeName);
  const homeByLast = oddsMap.get(`home:${homeLast}`);
  if (homeByLast) return homeByLast;

  return null;
}

/**
 * Invalidate all cached odds (e.g. after admin action).
 */
export function invalidateOddsCache() {
  for (const entry of _cache.values()) {
    entry.fetchedAt = 0;
  }
  _tennisCombined.fetchedAt = 0;
}
