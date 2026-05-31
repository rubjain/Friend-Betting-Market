/**
 * ESPN → DB market sync.
 *
 * Fetches the next 7 days of ESPN games and upserts each one as a real Market
 * record. The ESPN game ID (e.g. "espn_nba_401234567") is used directly as the
 * market ID so the live score rail auto-connects and duplicate synthetic markets
 * are suppressed by the existing isGameCoveredByExistingMarket check.
 *
 * This runs on every getDatabaseState call but is debounced to once per 5 min
 * so it never hammers ESPN.
 */

import { fetchEspnGamesForSync } from "../espnLiveGames.js";
import { getGameMarketCategory } from "../gameMarkets.js";
import { getResolutionTemplate } from "../marketTaxonomy.js";
import { hasDatabaseUrl } from "./prisma.js";
import { getTennisOddsMap, getMlbOddsMap, lookupOddsPrices } from "./oddsApiClient.js";

// In-process debounce — reset on process restart
let lastSyncAt = 0;
// 3 min: fast enough for live odds, cheap enough not to hammer ESPN
const SYNC_INTERVAL_MS = 3 * 60 * 1000;

// ---------------------------------------------------------------------------
// Odds math
// ---------------------------------------------------------------------------

/**
 * Convert an American moneyline integer to raw implied probability.
 * e.g. -155 → 0.608,  +130 → 0.435
 */
function americanToProb(line) {
  if (line > 0) return 100 / (line + 100);
  return Math.abs(line) / (Math.abs(line) + 100);
}

/**
 * Convert ESPN moneyline { home, away } to vig-removed { yesPrice, noPrice }.
 * YES = away team wins (convention used throughout Agora game markets).
 * Returns null if moneyline is missing or malformed.
 */
function moneylineToPrices(ml) {
  if (!ml?.home || !ml?.away) return null;
  const homeProb = americanToProb(ml.home);
  const awayProb = americanToProb(ml.away);
  if (!Number.isFinite(homeProb) || !Number.isFinite(awayProb)) return null;
  const total = homeProb + awayProb; // > 1.0 due to bookmaker vig
  // Normalize to remove vig — gives "true" probability
  return {
    yesPrice: parseFloat((awayProb / total).toFixed(4)), // away wins = YES
    noPrice: parseFloat((homeProb / total).toFixed(4)),  // home wins = NO
  };
}

// ---------------------------------------------------------------------------
// ESPN live win-probability (from game summary, only for in-progress games)
// ---------------------------------------------------------------------------

/**
 * Map ESPN sport category + summary path to the summary API base path.
 */
const SPORT_SUMMARY_BASE = {
  NBA: "basketball/nba",
  MLB: "baseball/mlb",
  NFL: "football/nfl",
  NHL: "hockey/nhl",
  Soccer: null, // handled via espnSummaryPath
  Tennis: null, // ESPN tennis doesn't expose win probability
};

/**
 * Fetch the latest live win probability for a game from ESPN's summary API.
 * Returns { yesPrice, noPrice } (YES = away wins) or null if unavailable.
 *
 * ESPN publishes homeWinPercentage — we flip it: awayWinPct = 1 - homeWinPct.
 */
async function fetchLiveWinProbability(game, category) {
  const eventId = game.espnEventId;
  if (!eventId || !["NBA", "MLB", "NFL", "NHL"].includes(category)) return null;

  const base = SPORT_SUMMARY_BASE[category];
  if (!base) return null;

  const url = `https://site.api.espn.com/apis/site/v2/sports/${base}/summary?event=${eventId}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const wp = data.winprobability;
    if (!Array.isArray(wp) || wp.length === 0) return null;
    const latest = wp[wp.length - 1];
    const homeWin = latest?.homeWinPercentage;
    if (!Number.isFinite(homeWin)) return null;

    const awayWin = 1 - homeWin;
    // Clamp — never show 100% or 0%
    const clamped = Math.min(0.97, Math.max(0.03, awayWin));
    return {
      yesPrice: parseFloat(clamped.toFixed(4)),         // away wins = YES
      noPrice: parseFloat((1 - clamped).toFixed(4)),    // home wins = NO
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------

/**
 * Determine the binary outcome of a finished game from its final score.
 * Convention used throughout Agora: YES = away team wins, NO = home team wins.
 *
 * Returns:
 *   "YES"  → away team won
 *   "NO"   → home team won
 *   "VOID" → tie/draw (binary market can't settle, refund stakes)
 *   null   → scores unavailable/indeterminate (leave for manual review)
 */
function resultFromFinalScore(game) {
  const away = Number(game.awayScore);
  const home = Number(game.homeScore);
  if (!Number.isFinite(away) || !Number.isFinite(home)) return null;
  // 0–0 almost always means ESPN hasn't populated the score yet, not a real
  // scoreless final — don't guess, let it stay paused for manual handling.
  if (away === 0 && home === 0) return null;
  if (away === home) return "VOID";
  return away > home ? "YES" : "NO";
}

/**
 * Settle the market for a game that has gone final. Idempotent: the underlying
 * resolveDatabaseMarket no-ops once a market is already RESOLVED/VOIDED. Falls
 * back to PAUSE when the winner can't be determined from the score.
 */
async function resolveFinalGameMarket(client, game) {
  const market = await client.market
    .findUnique({ where: { id: game.id }, select: { status: true } })
    .catch(() => null);
  // No market, or it's already been resolved/voided — nothing to do.
  if (!market || !["ACTIVE", "PAUSED", "RESOLVING", "DISPUTED"].includes(market.status)) {
    return;
  }

  const result = resultFromFinalScore(game);
  if (!result) {
    // Can't read a winner yet — pause so it leaves the live/active surfaces.
    await client.market
      .updateMany({ where: { id: game.id, status: "ACTIVE" }, data: { status: "PAUSED" } })
      .catch(() => {});
    return;
  }

  try {
    // Dynamic import breaks the dbState → espnMarketSync → marketService cycle.
    const { resolveDatabaseMarket } = await import("./marketService.js");
    await resolveDatabaseMarket({ activeId: game.id, result, client });
  } catch {
    // Resolution failed (e.g. transient DB error) — pause so it's not tradable.
    await client.market
      .updateMany({ where: { id: game.id, status: "ACTIVE" }, data: { status: "PAUSED" } })
      .catch(() => {});
  }
}

/** Sport-specific close window after game start (ms). */
const CLOSE_OFFSET_MS = {
  NBA: 3.5 * 60 * 60 * 1000,
  MLB: 5 * 60 * 60 * 1000,
  NFL: 4 * 60 * 60 * 1000,
  NHL: 4 * 60 * 60 * 1000,
  Soccer: 2.5 * 60 * 60 * 1000,
  Tennis: 4 * 60 * 60 * 1000,
};

function isTbdName(name) {
  if (!name) return true;
  return /^\s*(tbd|tba)\s*$/i.test(String(name).trim());
}

function closeAtForGame(game, category) {
  const startMs = Date.parse(game.startTime);
  if (!Number.isFinite(startMs)) return null;
  const offset = CLOSE_OFFSET_MS[category] ?? 4 * 60 * 60 * 1000;
  return new Date(startMs + offset);
}

function buildMarketTitle(game, category) {
  if (category === "Tennis") {
    return `${game.awayTeam} vs. ${game.homeTeam}`;
  }
  // Away @ Home — mirrors how Kalshi and most sportsbooks display matchups
  return `${game.awayTeam} @ ${game.homeTeam}`;
}

function buildResolutionRule(game, category) {
  if (category === "Tennis") {
    return `Resolves YES if ${game.awayTeam} wins the match against ${game.homeTeam}. Resolves NO if ${game.homeTeam} wins. Resolves VOID if the match is abandoned or either player retires before completion.`;
  }
  return `Resolves YES if ${game.awayTeam} wins against ${game.homeTeam} per the official final score. Resolves NO if ${game.homeTeam} wins. Resolves VOID if the game is postponed or cancelled without a result.`;
}

async function buildMarketData(game) {
  const category = getGameMarketCategory(game);
  const rt = getResolutionTemplate(category);
  const title = buildMarketTitle(game, category);
  const closeAt = closeAtForGame(game, category);

  // --- Pricing priority ---
  // 1. ESPN live win-probability (in-progress games only — reflects actual game state)
  // 2. ESPN-embedded DraftKings moneyline (pre-game opening lines)
  // 3. The Odds API bookmaker consensus (tennis primary; MLB when ESPN has no line)
  // 4. 50/50 fallback (pre-season games, unannounced MLB starters, etc.)
  let prices = null;
  let oddsSource = null;

  if (game.status === "live") {
    const liveProb = await fetchLiveWinProbability(game, category);
    if (liveProb) {
      prices = liveProb;
      oddsSource = "espn_live";
    }
  }

  if (!prices) {
    prices = moneylineToPrices(game.moneyline);
    if (prices) oddsSource = "espn_draftkings";
  }

  if (!prices && (category === "Tennis" || category === "MLB")) {
    try {
      const oddsMap = category === "Tennis"
        ? await getTennisOddsMap()
        : await getMlbOddsMap();
      const found = lookupOddsPrices(game.awayTeam, game.homeTeam, oddsMap);
      if (found) {
        prices = found;
        oddsSource = "odds_api";
      }
    } catch {
      // leave prices null — falls through to 50/50
    }
  }

  prices = prices ?? { yesPrice: 0.5, noPrice: 0.5 };
  const hasRealOdds = Boolean(oddsSource);

  return {
    id: game.id, // ESPN game ID IS the market ID
    title,
    question: title,
    description: `Live prediction market for ${game.awayTeam} vs ${game.homeTeam} (${game.league ?? category}). YES = ${game.awayTeam} wins.`,
    category,
    status: "ACTIVE",
    closeAt,
    ...prices,
    volume: 0,
    eligibleForBonus: false,
    resolutionTemplate: rt.template,
    resolutionRules: buildResolutionRule(game, category),
    externalSourceName: "espn",
    externalSourceId: game.id,
    metadata: {
      homeTeam: game.homeTeam,
      homeAbbr: game.homeAbbr ?? "",
      awayTeam: game.awayTeam,
      awayAbbr: game.awayAbbr ?? "",
      league: game.league ?? "",
      espnEventId: game.espnEventId ?? "",
      espnSummaryPath: game.espnSummaryPath ?? "",
      oddsSource: oddsSource ?? "default",
      oddsUpdatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Main entry point. Safe to call on every request — debounce handles throttling.
 * @param {import("@prisma/client").PrismaClient} client
 */
export async function syncEspnMarketsToDb(client) {
  if (!hasDatabaseUrl()) return;

  const now = Date.now();
  if (now - lastSyncAt < SYNC_INTERVAL_MS) return;
  lastSyncAt = now;

  let games;
  try {
    games = await fetchEspnGamesForSync();
  } catch {
    return; // ESPN down — don't crash state load
  }

  for (const game of games) {
    // Skip TBD matchups and completed games (final games get auto-PAUSED below)
    if (isTbdName(game.homeTeam) || isTbdName(game.awayTeam)) continue;

    if (game.status === "final") {
      // Settle the market from the final score (YES = away, NO = home, tie = VOID).
      // Idempotent + falls back to PAUSE when the winner can't be determined.
      await resolveFinalGameMarket(client, game);
      continue;
    }

    const data = await buildMarketData(game);

    try {
      await client.market.upsert({
        where: { id: game.id },
        create: {
          ...data,
          evidenceLinks: {
            create: [
              {
                label: "ESPN live scores",
                url: game.espnSummaryPath
                  ? `https://www.espn.com/${game.espnSummaryPath}`
                  : "https://www.espn.com",
                sourceType: "live",
              },
            ],
          },
        },
        update: {
          // Always refresh title (team names rarely change but can)
          title: data.title,
          question: data.question,
          // Always refresh odds — live games get ESPN win-probability,
          // scheduled games get opening lines. Both should stay current.
          yesPrice: data.yesPrice,
          noPrice: data.noPrice,
          metadata: data.metadata,
        },
      });
    } catch {
      // Skip — most likely a conflict on externalSourceId from a legacy row
    }
  }
}

/**
 * Force a sync on next call (clears the debounce). Useful after admin actions.
 */
export function invalidateEspnSyncCache() {
  lastSyncAt = 0;
}
