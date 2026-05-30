import { getResolutionTemplate } from "./marketTaxonomy.js";

const STATUS_ORDER = { live: 0, scheduled: 1, final: 2 };

/**
 * Maps a normalized ESPN/API game row to a browse filter category (NBA, Tennis, Soccer, …).
 */
export function getGameMarketCategory(game) {
  const id = String(game?.id ?? "");
  if (id.startsWith("espn_nba_")) return "NBA";
  if (id.startsWith("espn_wnba_")) return "NBA";
  if (id.startsWith("espn_nfl_")) return "NFL";
  if (id.startsWith("espn_mlb_")) return "MLB";
  if (id.startsWith("espn_nhl_")) return "NHL";
  if (id.startsWith("espn_tennis_")) return "Tennis";
  if (id.startsWith("espn_soccer_")) return "Soccer";
  if (id.startsWith("game_")) {
    const league = String(game?.league ?? "");
    if (league === "NBA") return "NBA";
    if (league === "MLB") return "MLB";
    if (league === "NFL") return "NFL";
    if (league === "NHL") return "NHL";
    if (league === "FIFA" || league === "Soccer") return "Soccer";
  }
  return "Soccer";
}

function sortGamesForDisplay(games) {
  return [...games].sort((a, b) => {
    const ra = STATUS_ORDER[a.status] ?? 3;
    const rb = STATUS_ORDER[b.status] ?? 3;
    if (ra !== rb) return ra - rb;
    return (Date.parse(a.startTime) || 0) - (Date.parse(b.startTime) || 0);
  });
}

/**
 * Live + upcoming (+ finals) for the score rail, optionally filtered by markets category tab.
 */
export function filterGamesForScoreRail(games, categoryFilter) {
  if (!Array.isArray(games) || games.length === 0) {
    return [];
  }
  const filtered =
    !categoryFilter || categoryFilter === "all"
      ? games
      : games.filter((g) => getGameMarketCategory(g) === categoryFilter);
  return sortGamesForDisplay(filtered).slice(0, 120);
}

function isGameCoveredByExistingMarket(game, baseMarkets) {
  const legacyIds = game.matchingLegacyIds;
  if (Array.isArray(legacyIds) && legacyIds.length) {
    const covered = baseMarkets.some((m) => m.liveGameId && legacyIds.includes(m.liveGameId));
    if (covered) return true;
  }
  return baseMarkets.some((m) => m.liveGameId === game.id || m.id === game.id);
}

function endDateIsoFromStart(startTime) {
  const t = Date.parse(startTime);
  if (!Number.isFinite(t)) {
    return new Date().toISOString().slice(0, 10);
  }
  return new Date(t + 2 * 86400000).toISOString().slice(0, 10);
}

/**
 * One binary market per feed game (moneyline: YES = away team wins).
 */
export function buildSyntheticGameMarket(game) {
  const category = getGameMarketCategory(game);
  const rt = getResolutionTemplate(category);
  const title = `${game.awayTeam} at ${game.homeTeam}`;
  const endDate = endDateIsoFromStart(game.startTime);

  return {
    id: game.id,
    title,
    category,
    liveGameId: game.id,
    h2h: true,
    yesPicks: "away",
    syntheticFromGame: true,
    status: "active",
    volume: 0,
    endDate,
    closeTime: `${endDate}T23:59:00Z`,
    yesPrice: 0.5,
    noPrice: 0.5,
    algorithm: {
      model: "Live sports tracker",
      dataFeeds: ["Official league result", game.league].filter(Boolean),
      refreshCadence: "Live",
    },
    resolutionRule: `Resolves YES if ${game.awayTeam} wins this match over ${game.homeTeam} under official competition rules. Resolves NO if ${game.homeTeam} wins or the listed outcome is a tie/draw where applicable.`,
    resolutionTemplate: rt.template,
    resolutionChecklist: rt.checklist,
    evidenceLinks: [{ label: rt.evidenceSource, url: "", sourceType: "live" }],
    description: `Live-generated market for ${title}. YES backs the road/listed-away side (${game.awayTeam}); NO backs ${game.homeTeam}.`,
    friendsBoosting: 0,
    friendGroup: [],
    recentActivity: [],
    eligibleForBonus: false,
  };
}

/**
 * Returns true if a game name is a placeholder (TBD/TBA/blank) meaning
 * players/teams haven't been determined yet.
 */
function isPlaceholderName(name) {
  if (!name) return true;
  const normalized = String(name).trim().toLowerCase();
  return normalized === "" || normalized === "tbd" || normalized === "tba" || normalized === "home" || normalized === "away";
}

/**
 * Returns true if this game should generate a synthetic market.
 * Filters out: completed (final) games, and matchups with undetermined participants.
 */
function isUsableGame(game) {
  if (game.status === "final") return false;
  if (isPlaceholderName(game.homeTeam) || isPlaceholderName(game.awayTeam)) return false;
  return true;
}

/** Stable matchup key so the same fixture never renders twice. */
function matchupKey(market) {
  const away = String(market?.metadata?.awayTeam ?? "").trim().toLowerCase();
  const home = String(market?.metadata?.homeTeam ?? "").trim().toLowerCase();
  if (away && home) return `${away}|${home}`;
  return String(market?.title ?? market?.id ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+(vs\.?|@|at)\s+/g, "|");
}

/** True when a market has real bookmaker/feed odds rather than the 50/50 fallback. */
function hasRealOdds(market) {
  const source = market?.metadata?.oddsSource;
  if (source && source !== "default") return true;
  const yes = Number(market?.yesPrice);
  return Number.isFinite(yes) && Math.abs(yes - 0.5) > 1e-6;
}

/**
 * Collapse duplicate fixtures to a single market, preferring the live one, then
 * the one with real odds, then the soonest to close. Kills the "one 50/50 + one
 * real-odds" repeat rows.
 */
function dedupeByMatchup(markets, liveGames) {
  const isLive = (m) => (liveGames || []).some((g) => g.id === m.id && g.status === "live");
  const best = new Map();
  for (const market of markets) {
    const key = matchupKey(market);
    const existing = best.get(key);
    if (!existing) {
      best.set(key, market);
      continue;
    }
    // Score candidates; higher wins.
    const score = (m) => {
      let s = 0;
      if (isLive(m)) s += 100;
      if (hasRealOdds(m)) s += 10;
      return s;
    };
    const se = score(existing);
    const sm = score(market);
    if (sm > se) {
      best.set(key, market);
    } else if (sm === se) {
      // tie-break: soonest close time
      const et = existing.closeTime ? Date.parse(existing.closeTime) : Infinity;
      const mt = market.closeTime ? Date.parse(market.closeTime) : Infinity;
      if (mt < et) best.set(key, market);
    }
  }
  // Preserve original ordering of the kept markets.
  const kept = new Set(best.values());
  return markets.filter((m) => kept.has(m));
}

/**
 * Prepends auto-generated game markets (live updates via linked game) ahead of seeded markets.
 */
export function mergeGameMarkets(baseMarkets = [], liveGames = []) {
  const sortedGames = sortGamesForDisplay([...(liveGames || [])]);
  const synthetic = [];
  for (const game of sortedGames) {
    if (!isUsableGame(game)) continue;
    if (isGameCoveredByExistingMarket(game, baseMarkets)) {
      continue;
    }
    synthetic.push(buildSyntheticGameMarket(game));
  }
  return dedupeByMatchup([...synthetic, ...baseMarkets], liveGames);
}

export function getMergedMarketsFromState(state) {
  return mergeGameMarkets(state.markets || [], state.liveGames || []);
}

/**
 * Merged market row for a scoreboard game (matches `liveGameId` or synthetic `id` === `game.id`).
 */
export function getMarketForLiveGame(game, markets = []) {
  if (!game?.id || !Array.isArray(markets)) {
    return null;
  }
  return markets.find((m) => m.liveGameId === game.id || m.id === game.id) ?? null;
}

/**
 * Open the linked prediction market when one exists; otherwise the live game detail view.
 */
export function getLiveGameNavPath(game, markets = []) {
  const m = getMarketForLiveGame(game, markets);
  if (m) {
    return `/markets/${m.id}`;
  }
  return `/live/${encodeURIComponent(game.id)}`;
}
