import { parseGamePointsFromStatusText } from "./tennisPointParsing.js";

function mapPlayBase(p) {
  if (!p) {
    return null;
  }
  return {
    id: String(p.id ?? ""),
    text: String(p.text ?? "").trim(),
    periodLabel: p.period?.displayValue ?? (p.period?.number != null ? `Period ${p.period.number}` : ""),
    clockLabel: p.clock?.displayValue ?? "",
    awayScore: p.awayScore,
    homeScore: p.homeScore,
    wallclock: p.wallclock ?? null,
    sequenceNumber: Number.parseInt(String(p.sequenceNumber ?? "0"), 10) || 0,
  };
}

function normalizeNba(json) {
  if (!Array.isArray(json.plays)) {
    return [];
  }
  return json.plays.map(mapPlayBase).filter((x) => x?.text);
}

function normalizeNhl(json) {
  return normalizeNba(json);
}

function flattenNflPlays(json) {
  const out = [];
  const prev = json.drives?.previous;
  if (Array.isArray(prev)) {
    for (const drive of prev) {
      for (const p of drive.plays ?? []) {
        const row = mapPlayBase(p);
        if (row?.text) {
          out.push(row);
        }
      }
    }
  }
  const cur = json.drives?.current;
  if (cur?.plays) {
    for (const p of cur.plays) {
      const row = mapPlayBase(p);
      if (row?.text) {
        out.push(row);
      }
    }
  }
  return out;
}

/**
 * @param {string} leagueUpper — NBA | NFL | MLB | NHL | ...
 */
function normalizeTennis(json) {
  if (!Array.isArray(json.plays)) {
    return [];
  }
  return json.plays.map(mapPlayBase).filter((x) => x?.text);
}

export function normalizeEspnSummaryPlays(json, leagueUpper) {
  const L = String(leagueUpper || "").toUpperCase();
  if (L === "NBA") {
    return normalizeNba(json);
  }
  if (L === "NHL") {
    return normalizeNhl(json);
  }
  if (L === "NFL") {
    return flattenNflPlays(json);
  }
  if (L === "TENNIS") {
    return normalizeTennis(json);
  }
  return [];
}

/**
 * Pull richer live fields from tennis summary `header.competitions[0]` when present.
 */
function tennisStatMap(statistics) {
  const out = {};
  if (!Array.isArray(statistics)) {
    return out;
  }
  for (const s of statistics) {
    const key = String(s?.name ?? s?.abbreviation ?? "")
      .toLowerCase()
      .replace(/\s+/g, "");
    const dv = s?.displayValue ?? s?.value;
    if (key && dv != null && dv !== "") {
      out[key] = String(dv);
    }
  }
  return out;
}

function pickGamePointsDisplay(stats) {
  const keys = Object.keys(stats);
  for (const k of keys) {
    if (k.includes("point") || k.includes("game") || k === "pts") {
      return stats[k];
    }
  }
  return stats.points ?? stats.p ?? null;
}

export function extractTennisBoardFromSummary(json) {
  const comp = json?.header?.competitions?.[0];
  if (!comp?.competitors?.length) {
    return null;
  }
  const away = comp.competitors.find((c) => c.homeAway === "away");
  const home = comp.competitors.find((c) => c.homeAway === "home");
  if (!away?.athlete || !home?.athlete) {
    return null;
  }
  const situation = comp.situation ?? null;
  const detail = comp.status?.type?.detail ?? "";
  const shortDetail = comp.status?.type?.shortDetail ?? "";

  const lines = (c) =>
    Array.isArray(c.linescores)
      ? c.linescores.map((row, i) => ({
          setIndex: i + 1,
          games: Number(row?.value ?? 0) || 0,
          tiebreak: row?.tiebreak != null ? Number(row.tiebreak) : null,
          winner: row?.winner === true,
        }))
      : [];

  const awayStats = tennisStatMap(away.statistics);
  const homeStats = tennisStatMap(home.statistics);

  let awayPts = pickGamePointsDisplay(awayStats);
  let homePts = pickGamePointsDisplay(homeStats);
  if (!String(awayPts || "").trim() || !String(homePts || "").trim()) {
    const parsed = parseGamePointsFromStatusText(detail, shortDetail);
    if (parsed) {
      awayPts = awayPts || parsed.away;
      homePts = homePts || parsed.home;
    }
  }

  let servingSide = null;
  if (situation?.lastPlay?.priorityAthlete?.id) {
    const pid = String(situation.lastPlay.priorityAthlete.id);
    if (String(away.athlete?.id ?? "") === pid) {
      servingSide = "away";
    }
    if (String(home.athlete?.id ?? "") === pid) {
      servingSide = "home";
    }
  }

  const awayLinesRaw = away.linescores ?? [];
  const homeLinesRaw = home.linescores ?? [];
  let awaySets = 0;
  let homeSets = 0;
  const n = Math.max(awayLinesRaw.length, homeLinesRaw.length);
  for (let i = 0; i < n; i++) {
    const aw = awayLinesRaw[i];
    const hw = homeLinesRaw[i];
    if (!aw && !hw) {
      continue;
    }
    if (aw?.winner === true) {
      awaySets++;
    } else if (hw?.winner === true) {
      homeSets++;
    }
  }

  return {
    away: {
      name: away.athlete.displayName ?? "",
      short: away.athlete.shortName ?? "",
      linescores: lines(away),
      pointsDisplay: awayPts || null,
    },
    home: {
      name: home.athlete.displayName ?? "",
      short: home.athlete.shortName ?? "",
      linescores: lines(home),
      pointsDisplay: homePts || null,
    },
    setsWon: { away: awaySets, home: homeSets },
    statusDetail: detail,
    shortDetail,
    period: comp.status?.period ?? null,
    servingSide,
    situation,
    lastPlayText: situation?.lastPlay?.text ?? null,
    court: comp.venue?.court ?? null,
    roundName: comp.round?.displayName ?? null,
    formatPeriods: comp.format?.regulation?.periods ?? 3,
  };
}

/** Sort newest-first for live feeds (sequence then wallclock). */
export function sortPlaysNewestFirst(plays) {
  return [...plays].sort((a, b) => {
    if (b.sequenceNumber !== a.sequenceNumber) {
      return b.sequenceNumber - a.sequenceNumber;
    }
    const tb = Date.parse(b.wallclock || "") || 0;
    const ta = Date.parse(a.wallclock || "") || 0;
    return tb - ta;
  });
}

function zipStatRow(names, stats) {
  const row = {};
  if (!Array.isArray(names) || !Array.isArray(stats)) {
    return row;
  }
  for (let i = 0; i < names.length; i++) {
    row[names[i]] = stats[i] ?? "—";
  }
  return row;
}

/**
 * NBA player box score from ESPN summary `boxscore.players` (paired with `boxscore.teams`).
 * @returns {{ away: object, home: object } | null}
 */
export function normalizeNbaPlayerBoxFromSummary(json) {
  const box = json?.boxscore;
  if (!box?.teams?.length || !box?.players) {
    return null;
  }

  const teamById = new Map(box.teams.map((t) => [String(t.team?.id ?? ""), t]));

  const out = { away: null, home: null };

  for (const key of Object.keys(box.players)) {
    const block = box.players[key];
    const tid = String(block.team?.id ?? "");
    const teamRow = teamById.get(tid);
    const ha = teamRow?.homeAway;
    if (ha !== "away" && ha !== "home") {
      continue;
    }

    const statBlock = block.statistics?.[0];
    const names = statBlock?.names;
    const athletes = statBlock?.athletes;
    if (!Array.isArray(names) || !Array.isArray(athletes)) {
      continue;
    }

    const players = [];
    for (const row of athletes) {
      const athlete = row?.athlete;
      const statsArr = row?.stats;
      if (!athlete?.displayName || !Array.isArray(statsArr)) {
        continue;
      }
      players.push({
        name: String(athlete.displayName),
        shortName: String(athlete.shortName ?? athlete.displayName),
        starter: !!row.starter,
        stats: zipStatRow(names, statsArr),
      });
    }

    out[ha] = {
      abbreviation: String(block.team?.abbreviation ?? ""),
      teamName: String(block.team?.displayName ?? block.team?.name ?? ""),
      players,
    };
  }

  if (!out.away && !out.home) {
    return null;
  }
  return out;
}
