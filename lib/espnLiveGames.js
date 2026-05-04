/**
 * Live scoreboard data from ESPN's public site API (read-only JSON).
 * Docs are unofficial; paths follow https://site.api.espn.com/.../scoreboard
 */

export const LEGACY_GAME_TEAMSETS = [
  { legacyId: "game_cavs_raptors", league: "NBA", teams: ["CLE", "TOR"] },
  { legacyId: "game_knicks_celtics", league: "NBA", teams: ["NY", "BOS"] },
  { legacyId: "game_mets_braves", league: "MLB", teams: ["NYM", "ATL"] },
];

const NBA_BOARD = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const MLB_BOARD = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";
const NFL_BOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
const NHL_BOARD = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard";

/** ESPN soccer scoreboard paths → short league labels shown in UI */
const SOCCER_SLUGS = [
  ["usa.1", "MLS"],
  ["eng.1", "EPL"],
  ["uefa.champions", "UCL"],
  ["esp.1", "La Liga"],
  ["ita.1", "Serie A"],
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
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
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
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
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
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
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
    awayTeam: away.team.displayName ?? away.team.name,
    awayAbbr: away.team.abbreviation,
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

async function fetchScoreboardJson(url, dates, signal) {
  const collected = [];
  for (const date of dates) {
    const sep = url.includes("?") ? "&" : "?";
    const requestUrl = `${url}${sep}dates=${date}&limit=400`;
    const res = await fetch(requestUrl, {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      continue;
    }
    const json = await res.json();
    if (Array.isArray(json.events)) {
      collected.push(...json.events);
    }
  }
  return collected;
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

  const signal = options.signal ?? AbortSignal.timeout(22_000);
  const dates = scoreboardDateKeys(now);

  let raw = [];
  let soccerBatches;
  try {
    const soccerFetches = SOCCER_SLUGS.map(([slug]) =>
      fetchScoreboardJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`, dates, signal),
    );
    const [nba, mlb, nfl, nhl, ...socBatches] = await Promise.all([
      fetchScoreboardJson(NBA_BOARD, dates, signal),
      fetchScoreboardJson(MLB_BOARD, dates, signal),
      fetchScoreboardJson(NFL_BOARD, dates, signal),
      fetchScoreboardJson(NHL_BOARD, dates, signal),
      ...soccerFetches,
    ]);
    raw = dedupeEvents([...nba, ...mlb, ...nfl, ...nhl]);
    soccerBatches = socBatches;
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

  SOCCER_SLUGS.forEach(([slug, tag], i) => {
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

  return sortGames(games);
}
