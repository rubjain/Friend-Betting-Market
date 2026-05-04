/**
 * Live scoreboard data from ESPN's public site API (read-only JSON).
 * Docs are unofficial; paths follow https://site.api.espn.com/.../scoreboard
 */

import { countCompletedTennisSetsWon, extractTennisSnapshotFromCompetition } from "./tennisScoreboard.js";

export const LEGACY_GAME_TEAMSETS = [
  { legacyId: "game_cavs_raptors", league: "NBA", teams: ["CLE", "TOR"] },
  { legacyId: "game_knicks_celtics", league: "NBA", teams: ["NY", "BOS"] },
  { legacyId: "game_mets_braves", league: "MLB", teams: ["NYM", "ATL"] },
];

const NBA_BOARD = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const MLB_BOARD = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";
const NFL_BOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const NHL_BOARD = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard";

/**
 * ESPN soccer scoreboard paths (`sports/soccer/{slug}/scoreboard`) → UI league labels.
 * Unsupported slugs simply return no rows; safe to keep a broad list.
 */
export const SOCCER_LEAGUES = [
  ["usa.1", "MLS"],
  ["eng.1", "EPL"],
  ["esp.1", "La Liga"],
  ["ita.1", "Serie A"],
  ["ger.1", "Bundesliga"],
  ["fra.1", "Ligue 1"],
  ["ned.1", "Eredivisie"],
  ["por.1", "Primeira"],
  ["bel.1", "Belgium"],
  ["sco.1", "Scottish"],
  ["tur.1", "Süper Lig"],
  ["aut.1", "Austria"],
  ["sui.1", "Swiss"],
  ["gre.1", "Greece"],
  ["den.1", "Denmark"],
  ["swe.1", "Allsvenskan"],
  ["nor.1", "Norway"],
  ["irn.1", "Iran"],
  ["rsa.1", "South Africa"],
  ["mex.1", "Liga MX"],
  ["bra.1", "Brasileirão"],
  ["bra.comp.camp_eagle", "Copa BR"],
  ["arg.1", "Argentina"],
  ["chi.1", "Chile"],
  ["col.1", "Colombia"],
  ["uru.1", "Uruguay"],
  ["ecu.1", "Ecuador"],
  ["per.1", "Peru"],
  ["par.1", "Paraguay"],
  ["jpn.1", "J1 League"],
  ["kor.1", "K League"],
  ["aus.1", "A-League"],
  ["chn.1", "China SL"],
  ["ind.1", "India"],
  ["tha.1", "Thailand"],
  ["usa.open.cup", "US Open Cup"],
  ["eng.2", "EFL Champ"],
  ["eng.3", "EFL One"],
  ["ger.2", "2. Bundesliga"],
  ["esp.2", "La Liga 2"],
  ["ita.2", "Serie B"],
  ["fra.2", "Ligue 2"],
  ["uefa.champions", "UCL"],
  ["uefa.europa", "UEL"],
  ["uefa.europa.conf", "UECL"],
  ["uefa.nations", "Nations Lg"],
  ["fifa.world", "World Cup"],
  ["conmebol.libertadores", "Libertadores"],
  ["conmebol.sudamericana", "Sudamericana"],
  ["afc.champions", "ACL"],
  ["caf.champions", "CAF CL"],
  ["concacaf.champions", "CCL"],
];

function yyyymmddInTimeZone(date, timeZone) {
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return formatted.replace(/-/g, "");
}

function scoreboardDateKeys(now = new Date()) {
  const tz = "America/New_York";
  const keys = new Set();
  for (const delta of [-86400000, 0, 86400000]) {
    keys.add(yyyymmddInTimeZone(new Date(now.getTime() + delta), tz));
  }
  return [...keys];
}

function firstStat(statistics, abbreviations) {
  if (!Array.isArray(statistics)) {
    return "";
  }
  for (const abbr of abbreviations) {
    const row = statistics.find((s) => s.abbreviation === abbr);
    if (row?.displayValue) {
      return String(row.displayValue);
    }
  }
  return "";
}

function formatFgMadeAttempted(statistics) {
  const fgm = firstStat(statistics, ["FGM"]);
  const fga = firstStat(statistics, ["FGA"]);
  if (fgm && fga) {
    return `${fgm}-${fga}`;
  }
  return "";
}

function formatTpMadeAttempted(statistics) {
  const tpm = firstStat(statistics, ["3PM"]);
  const tpa = firstStat(statistics, ["3PA"]);
  if (tpm && tpa) {
    return `${tpm}-${tpa}`;
  }
  return "";
}

function nbaLinescoreArray(linescores) {
  if (!Array.isArray(linescores)) {
    return [null, null, null, null];
  }
  const out = [null, null, null, null];
  for (const row of linescores) {
    const idx = Number(row.period) - 1;
    if (idx >= 0 && idx < 4) {
      out[idx] = Number.parseInt(String(row.value), 10);
    }
  }
  return out;
}

function buildNbaBoxScore(competition) {
  const competitors = competition?.competitors;
  if (!Array.isArray(competitors) || competitors.length < 2) {
    return null;
  }
  const away = competitors.find((c) => c.homeAway === "away");
  const home = competitors.find((c) => c.homeAway === "home");
  if (!away?.statistics || !home?.statistics) {
    return null;
  }

  const awayTot = {
    fg: formatFgMadeAttempted(away.statistics),
    fgPct: firstStat(away.statistics, ["FG%"]),
    tp: formatTpMadeAttempted(away.statistics),
    ft: `${firstStat(away.statistics, ["FTM"])}-${firstStat(away.statistics, ["FTA"])}`.replace(/^-|-$/g, "") || "",
    reb: firstStat(away.statistics, ["REB"]),
    ast: firstStat(away.statistics, ["AST"]),
    to: firstStat(away.statistics, ["TO", "TOV"]),
  };

  const homeTot = {
    fg: formatFgMadeAttempted(home.statistics),
    fgPct: firstStat(home.statistics, ["FG%"]),
    tp: formatTpMadeAttempted(home.statistics),
    ft: `${firstStat(home.statistics, ["FTM"])}-${firstStat(home.statistics, ["FTA"])}`.replace(/^-|-$/g, "") || "",
    reb: firstStat(home.statistics, ["REB"]),
    ast: firstStat(home.statistics, ["AST"]),
    to: firstStat(home.statistics, ["TO", "TOV"]),
  };

  return {
    away: {
      linescore: nbaLinescoreArray(away.linescores),
      totals: awayTot,
    },
    home: {
      linescore: nbaLinescoreArray(home.linescores),
      totals: homeTot,
    },
  };
}

function collectTopPerformers(competition, limit = 3) {
  const competitors = competition?.competitors;
  if (!Array.isArray(competitors)) {
    return [];
  }
  const candidates = [];
  for (const comp of competitors) {
    const ptsCat = Array.isArray(comp.leaders) ? comp.leaders.find((l) => l.name === "points") : null;
    const leader = ptsCat?.leaders?.[0];
    const athlete = leader?.athlete;
    if (!athlete?.fullName || leader?.displayValue === undefined) {
      continue;
    }
    candidates.push({
      name: athlete.fullName,
      team: comp.team?.abbreviation ?? "",
      line: `${leader.displayValue} pts`,
      _sort: Number(leader.value) || 0,
    });
  }
  candidates.sort((a, b) => b._sort - a._sort);
  return candidates.slice(0, limit).map(({ name, team, line }) => ({ name, team, line }));
}

function mapNbaPeriod(period) {
  const p = Number(period);
  if (!Number.isFinite(p) || p <= 0) {
    return "—";
  }
  if (p <= 4) {
    return `Q${p}`;
  }
  return `OT${p - 4}`;
}

function mapGameStatus(state) {
  if (state === "in") {
    return "live";
  }
  if (state === "post") {
    return "final";
  }
  return "scheduled";
}

function attachLegacyMatches(game) {
  const abbrs = [game.awayAbbr, game.homeAbbr].filter(Boolean);
  const matchingLegacyIds = [];
  for (const spec of LEGACY_GAME_TEAMSETS) {
    if (spec.league !== game.league) {
      continue;
    }
    const ok = spec.teams.every((t) => abbrs.includes(t));
    if (ok) {
      matchingLegacyIds.push(spec.legacyId);
    }
  }
  if (matchingLegacyIds.length) {
    return { ...game, matchingLegacyIds };
  }
  return game;
}

/** ESPN `team.color` / `team.primaryColor` as `#RRGGBB` for chart accents. */
function espnTeamPrimaryHex(team) {
  const raw = team?.color ?? team?.primaryColor;
  if (raw == null || raw === "") {
    return undefined;
  }
  const s = String(raw).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) {
    return s.toUpperCase();
  }
  if (/^[0-9A-Fa-f]{6}$/.test(s)) {
    return `#${s.toUpperCase()}`;
  }
  return undefined;
}

function mapNbaEvent(event, now) {
  const competition = event.competitions?.[0];
  if (!competition) {
    return null;
  }
  const competitors = competition.competitors;
  const away = competitors?.find((c) => c.homeAway === "away");
  const home = competitors?.find((c) => c.homeAway === "home");
  if (!away?.team || !home?.team) {
    return null;
  }

  const statusType = event.status?.type;
  const state = statusType?.state ?? "pre";
  const status = mapGameStatus(state);
  const period = mapNbaPeriod(event.status?.period);
  const clock =
    status === "live"
      ? (event.status?.displayClock ?? statusType?.shortDetail ?? "—").trim()
      : status === "final"
        ? "Final"
        : statusType?.detail ?? "Scheduled";

  const awayScore = Number.parseInt(String(away.score ?? "0"), 10);
  const homeScore = Number.parseInt(String(home.score ?? "0"), 10);
  const boxScore = buildNbaBoxScore(competition);
  const topPerformers = collectTopPerformers(competition);
  const lastPlay = competition.situation?.lastPlay?.text;

  const updates = [];
  if (lastPlay) {
    updates.push(`${statusType?.shortDetail ?? ""}: ${lastPlay}`.trim());
  }
  updates.push(`ESPN scoreboard · ${event.shortName ?? `${away.team.abbreviation} @ ${home.team.abbreviation}`}`);

  const game = {
    id: `espn_nba_${event.id}`,
    shortName: away.team.shortDisplayName ?? away.team.displayName ?? away.team.abbreviation,
    league: "NBA",
    status,
    period,
    clock,
    homeTeam: home.team.displayName ?? home.team.name,
    homeAbbr: home.team.abbreviation,
    homeTeamColor: espnTeamPrimaryHex(home.team),
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
    awayTeamColor: espnTeamPrimaryHex(away.team),
    homeScore: Number.isFinite(homeScore) ? homeScore : 0,
    awayScore: Number.isFinite(awayScore) ? awayScore : 0,
    venue: competition.venue?.fullName ?? "",
    startTime: competition.date ?? event.date,
    lastUpdated: now.toISOString(),
    feedStatus: "Live scores · ESPN public API (site.api.espn.com)",
    broadcast: competition.broadcasts?.[0]?.names?.join(" · ") ?? "TV/stream varies by market",
    boxScore,
    topPerformers,
    updates,
    espnEventId: String(event.id),
  };

  return attachLegacyMatches(game);
}

function mapMlbEvent(event, now) {
  const competition = event.competitions?.[0];
  if (!competition) {
    return null;
  }
  const competitors = competition.competitors;
  const away = competitors?.find((c) => c.homeAway === "away");
  const home = competitors?.find((c) => c.homeAway === "home");
  if (!away?.team || !home?.team) {
    return null;
  }

  const statusType = event.status?.type;
  const state = statusType?.state ?? "pre";
  const status = mapGameStatus(state);
  const detail = statusType?.shortDetail ?? statusType?.detail ?? "";

  const game = {
    id: `espn_mlb_${event.id}`,
    shortName: away.team.shortDisplayName ?? away.team.displayName ?? away.team.abbreviation,
    league: "MLB",
    status,
    period: detail || (status === "scheduled" ? "Pregame" : "—"),
    clock: status === "live" ? detail : status === "final" ? "Final" : detail || "Scheduled",
    homeTeam: home.team.displayName ?? home.team.name,
    homeAbbr: home.team.abbreviation,
    homeTeamColor: espnTeamPrimaryHex(home.team),
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
    awayTeamColor: espnTeamPrimaryHex(away.team),
    homeScore: Number.parseInt(String(home.score ?? "0"), 10) || 0,
    awayScore: Number.parseInt(String(away.score ?? "0"), 10) || 0,
    venue: competition.venue?.fullName ?? "",
    startTime: competition.date ?? event.date,
    lastUpdated: now.toISOString(),
    feedStatus: "Live scores · ESPN public API (site.api.espn.com)",
    broadcast: competition.broadcasts?.[0]?.names?.join(" · ") ?? "",
    updates: [
      detail ? `${detail} · ${event.shortName ?? ""}`.trim() : event.shortName ?? "",
      "ESPN MLB scoreboard",
    ].filter(Boolean),
    espnEventId: String(event.id),
  };

  return attachLegacyMatches(game);
}

function mapNflEvent(event, now) {
  const competition = event.competitions?.[0];
  if (!competition) {
    return null;
  }
  const competitors = competition.competitors;
  const away = competitors?.find((c) => c.homeAway === "away");
  const home = competitors?.find((c) => c.homeAway === "home");
  if (!away?.team || !home?.team) {
    return null;
  }
  const statusType = event.status?.type;
  const state = statusType?.state ?? "pre";
  const status = mapGameStatus(state);
  const detail = statusType?.shortDetail ?? statusType?.detail ?? "";

  const game = {
    id: `espn_nfl_${event.id}`,
    shortName: away.team.shortDisplayName ?? away.team.displayName ?? away.team.abbreviation,
    league: "NFL",
    status,
    period: detail || "—",
    clock:
      status === "live"
        ? detail
        : status === "final"
          ? "Final"
          : detail || "Scheduled",
    homeTeam: home.team.displayName ?? home.team.name,
    homeAbbr: home.team.abbreviation,
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
    homeScore: Number.parseInt(String(home.score ?? "0"), 10) || 0,
    awayScore: Number.parseInt(String(away.score ?? "0"), 10) || 0,
    venue: competition.venue?.fullName ?? "",
    startTime: competition.date ?? event.date,
    lastUpdated: now.toISOString(),
    feedStatus: "Live scores · ESPN public API (site.api.espn.com)",
    broadcast: competition.broadcasts?.[0]?.names?.join(" · ") ?? "",
    updates: [detail, "ESPN NFL scoreboard"].filter(Boolean),
    espnEventId: String(event.id),
  };

  return attachLegacyMatches(game);
}

function mapNhlEvent(event, now) {
  const competition = event.competitions?.[0];
  if (!competition) {
    return null;
  }
  const competitors = competition.competitors;
  const away = competitors?.find((c) => c.homeAway === "away");
  const home = competitors?.find((c) => c.homeAway === "home");
  if (!away?.team || !home?.team) {
    return null;
  }
  const statusType = event.status?.type;
  const state = statusType?.state ?? "pre";
  const status = mapGameStatus(state);
  const detail = statusType?.shortDetail ?? statusType?.detail ?? "";

  const game = {
    id: `espn_nhl_${event.id}`,
    shortName: away.team.shortDisplayName ?? away.team.displayName ?? away.team.abbreviation,
    league: "NHL",
    status,
    period: detail || "—",
    clock:
      status === "live"
        ? detail
        : status === "final"
          ? "Final"
          : detail || "Scheduled",
    homeTeam: home.team.displayName ?? home.team.name,
    homeAbbr: home.team.abbreviation,
    homeTeamColor: espnTeamPrimaryHex(home.team),
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
    awayTeamColor: espnTeamPrimaryHex(away.team),
    homeScore: Number.parseInt(String(home.score ?? "0"), 10) || 0,
    awayScore: Number.parseInt(String(away.score ?? "0"), 10) || 0,
    venue: competition.venue?.fullName ?? "",
    startTime: competition.date ?? event.date,
    lastUpdated: now.toISOString(),
    feedStatus: "Live scores · ESPN public API (site.api.espn.com)",
    broadcast: competition.broadcasts?.[0]?.names?.join(" · ") ?? "",
    updates: [detail, "ESPN NHL scoreboard"].filter(Boolean),
    espnEventId: String(event.id),
  };

  return attachLegacyMatches(game);
}

function soccerLeagueSlugForId(leagueTag) {
  return String(leagueTag).replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
}

function mapSoccerEvent(event, now, leagueTag, boardSlug) {
  const competition = event.competitions?.[0];
  if (!competition) {
    return null;
  }
  const competitors = competition.competitors;
  const away = competitors?.find((c) => c.homeAway === "away");
  const home = competitors?.find((c) => c.homeAway === "home");
  if (!away?.team || !home?.team) {
    return null;
  }

  const statusType = event.status?.type;
  const state = statusType?.state ?? "pre";
  const status = mapGameStatus(state);
  const detail = statusType?.shortDetail ?? statusType?.detail ?? "";

  const game = {
    id: `espn_soccer_${soccerLeagueSlugForId(leagueTag)}_${event.id}`,
    shortName: away.team.shortDisplayName ?? away.team.displayName ?? away.team.abbreviation,
    league: leagueTag,
    status,
    period: detail || (status === "scheduled" ? "Pregame" : "—"),
    clock: status === "live" ? detail : status === "final" ? "Final" : detail || "Scheduled",
    homeTeam: home.team.displayName ?? home.team.name,
    homeAbbr: home.team.abbreviation,
    homeTeamColor: espnTeamPrimaryHex(home.team),
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
    awayTeamColor: espnTeamPrimaryHex(away.team),
    homeScore: Number.parseInt(String(home.score ?? "0"), 10) || 0,
    awayScore: Number.parseInt(String(away.score ?? "0"), 10) || 0,
    venue: competition.venue?.fullName ?? "",
    startTime: competition.date ?? event.date,
    lastUpdated: now.toISOString(),
    feedStatus: "Live scores · ESPN public API (site.api.espn.com)",
    broadcast: competition.broadcasts?.[0]?.names?.join(" · ") ?? "",
    updates: [
      detail ? `${detail} · ${event.shortName ?? ""}`.trim() : event.shortName ?? "",
      `ESPN ${leagueTag} scoreboard`,
    ].filter(Boolean),
    espnEventId: String(event.id),
    espnSummaryPath: `soccer/${boardSlug}`,
  };

  return attachLegacyMatches(game);
}

function mapTennisCompetition(parentEvent, competition, now, leagueTag, boardSlug, bracketLabel) {
  const competitors = competition?.competitors;
  if (!Array.isArray(competitors) || competitors.length < 2) {
    return null;
  }
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home?.athlete || !away?.athlete) {
    return null;
  }

  const [homeSets, awaySets] = countCompletedTennisSetsWon(home, away);
  const statusType = competition.status?.type;
  const state = statusType?.state ?? "pre";
  const status = mapGameStatus(state);
  const detail = statusType?.shortDetail ?? statusType?.detail ?? "";
  const periodNum = competition.status?.period;
  const period =
    status === "live" && periodNum
      ? `Set ${periodNum}`
      : bracketLabel || "Match";

  const homeName = home.athlete.displayName ?? home.athlete.fullName ?? "Home";
  const awayName = away.athlete.displayName ?? away.athlete.fullName ?? "Away";
  const homeShort = home.athlete.shortName ?? homeName.split(" ").pop() ?? homeName;
  const awayShort = away.athlete.shortName ?? awayName.split(" ").pop() ?? awayName;

  const tournament = parentEvent.shortName ?? parentEvent.name ?? leagueTag;
  const clock =
    status === "live"
      ? detail || "Live"
      : status === "final"
        ? "Final"
        : detail || "Scheduled";

  const tennisSnapshot = extractTennisSnapshotFromCompetition(competition, [awaySets, homeSets]);

  return {
    id: `espn_tennis_${boardSlug}_${competition.id}`,
    shortName: awayShort,
    league: `${leagueTag} · ${tournament}`,
    status,
    period,
    clock,
    homeTeam: homeName,
    homeAbbr: homeShort,
    homeTeamColor: espnTeamPrimaryHex(home.athlete?.team),
    awayTeam: awayName,
    awayAbbr: awayShort,
    awayTeamColor: espnTeamPrimaryHex(away.athlete?.team),
    homeScore: homeSets,
    awayScore: awaySets,
    tennis: tennisSnapshot,
    espnParentEventId: String(parentEvent.id ?? ""),
    venue: competition.venue?.fullName ?? parentEvent.venue?.fullName ?? "",
    startTime: competition.startDate ?? competition.date ?? parentEvent.date,
    lastUpdated: now.toISOString(),
    feedStatus: `Live scores · ESPN tennis (${leagueTag})`,
    broadcast: competition.broadcast ?? "",
    updates: [
      `${awayShort} vs ${homeShort} · ${tournament}`,
      bracketLabel ? `${bracketLabel}` : "",
      detail,
    ].filter(Boolean),
    espnEventId: String(competition.id),
    espnSummaryPath: `tennis/${boardSlug}`,
  };
}

function flattenTennisScoreboardEvents(events, now, leagueTag, boardSlug) {
  const games = [];
  if (!Array.isArray(events)) {
    return games;
  }
  for (const parentEvent of events) {
    for (const grouping of parentEvent.groupings ?? []) {
      const bracketLabel = grouping.grouping?.displayName ?? "";
      for (const competition of grouping.competitions ?? []) {
        const mapped = mapTennisCompetition(parentEvent, competition, now, leagueTag, boardSlug, bracketLabel);
        if (mapped) {
          games.push(mapped);
        }
      }
    }
  }
  return games;
}

async function fetchScoreboardJson(url, dates, signal) {
  const batches = await Promise.all(
    dates.map(async (date) => {
      const sep = url.includes("?") ? "&" : "?";
      const requestUrl = `${url}${sep}dates=${date}&limit=400`;
      try {
        const res = await fetch(requestUrl, {
          signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) {
          return [];
        }
        const json = await res.json();
        return Array.isArray(json.events) ? json.events : [];
      } catch {
        return [];
      }
    }),
  );
  return dedupeEvents(batches.flat());
}

function dedupeEvents(events) {
  const byId = new Map();
  for (const ev of events) {
    if (ev?.id && !byId.has(ev.id)) {
      byId.set(ev.id, ev);
    }
  }
  return [...byId.values()];
}

function sortGames(games) {
  const rank = { live: 0, scheduled: 1, final: 2 };
  return [...games].sort((a, b) => {
    const dr = (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
    if (dr !== 0) {
      return dr;
    }
    const ta = Date.parse(a.startTime || "") || 0;
    const tb = Date.parse(b.startTime || "") || 0;
    return ta - tb;
  });
}

/**
 * Returns normalized games for the app, or [] if all requests fail.
 */
export async function fetchEspnLiveGames(now = new Date(), options = {}) {
  if (process.env.FRIENDMARKET_DISABLE_ESPN === "1") {
    return [];
  }

  const signal = options.signal ?? AbortSignal.timeout(55_000);
  const dates = scoreboardDateKeys(now);

  let raw = [];
  let soccerBatches;
  let atpEvents = [];
  let wtaEvents = [];
  try {
    const soccerFetches = SOCCER_LEAGUES.map(([slug]) =>
      fetchScoreboardJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`, dates, signal),
    );
    const ATP_BOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard";
    const WTA_BOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/tennis/wta/scoreboard";
    const [nba, mlb, nfl, nhl, atpEventsBatch, wtaEventsBatch, ...socBatches] = await Promise.all([
      fetchScoreboardJson(NBA_BOARD, dates, signal),
      fetchScoreboardJson(MLB_BOARD, dates, signal),
      fetchScoreboardJson(NFL_BOARD, dates, signal),
      fetchScoreboardJson(NHL_BOARD, dates, signal),
      fetchScoreboardJson(ATP_BOARD_URL, dates, signal),
      fetchScoreboardJson(WTA_BOARD_URL, dates, signal),
      ...soccerFetches,
    ]);
    raw = dedupeEvents([...nba, ...mlb, ...nfl, ...nhl]);
    soccerBatches = socBatches;
    atpEvents = atpEventsBatch;
    wtaEvents = wtaEventsBatch;
  } catch {
    return [];
  }

  const games = [];
  for (const event of raw) {
    const uid = String(event?.uid ?? "");
    let mapped = null;
    if (uid.includes("~l:46~")) {
      mapped = mapNbaEvent(event, now);
    } else if (uid.includes("~l:10~")) {
      mapped = mapMlbEvent(event, now);
    } else if (uid.includes("~l:28~")) {
      mapped = mapNflEvent(event, now);
    } else if (uid.includes("~l:90~")) {
      mapped = mapNhlEvent(event, now);
    }
    if (mapped) {
      games.push(mapped);
    }
  }

  SOCCER_LEAGUES.forEach(([slug, tag], i) => {
    const batch = soccerBatches?.[i];
    if (!Array.isArray(batch)) {
      return;
    }
    for (const event of batch) {
      const mapped = mapSoccerEvent(event, now, tag, slug);
      if (mapped) {
        games.push(mapped);
      }
    }
  });

  games.push(...flattenTennisScoreboardEvents(atpEvents, now, "ATP", "atp"));
  games.push(...flattenTennisScoreboardEvents(wtaEvents, now, "WTA", "wta"));

  return sortGames(games);
}
