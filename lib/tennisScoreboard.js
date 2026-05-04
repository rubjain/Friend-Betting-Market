/**
 * Normalize ATP/WTA competition rows from ESPN scoreboards into rich tennis snapshots.
 */

import { parseGamePointsFromStatusText } from "./tennisPointParsing.js";

/**
 * Infer who won a completed set when ESPN omits `winner` (older feeds).
 * Returns "home" | "away" | null if the set is still in progress or undecidable.
 */
export function inferCompletedSetWinnerFromGames(hv, av) {
  const h = Number(hv ?? 0);
  const a = Number(av ?? 0);
  if (h === 0 && a === 0) {
    return null;
  }
  const max = Math.max(h, a);
  const min = Math.min(h, a);
  const diff = max - min;
  // Standard set: margin ≥ 2 with at least 6 games for leader (6–4, 7–5, …).
  if (max >= 6 && diff >= 2) {
    return h > a ? "home" : "away";
  }
  // 7–6 after tiebreak when TB scores live on separate fields only as game totals.
  if (h === 7 && a === 6) {
    return "home";
  }
  if (a === 7 && h === 6) {
    return "away";
  }
  return null;
}

/**
 * Count **completed** sets only. Leading 4–1 in games within the current set must show **0–0 sets**.
 * Prefer ESPN `winner` on each player's linescore row; tiebreak numbers when both present;
 * otherwise conservative score inference via {@link inferCompletedSetWinnerFromGames}.
 *
 * @returns {[number, number]} `[homeSetsWon, awaySetsWon]`
 */
export function countCompletedTennisSetsWon(home, away) {
  const hLines = home?.linescores ?? [];
  const aLines = away?.linescores ?? [];
  const n = Math.max(hLines.length, aLines.length);
  let homeSets = 0;
  let awaySets = 0;

  for (let i = 0; i < n; i++) {
    const hLine = hLines[i];
    const aLine = aLines[i];
    if (!hLine && !aLine) {
      continue;
    }

    if (hLine?.winner === true) {
      homeSets++;
      continue;
    }
    if (aLine?.winner === true) {
      awaySets++;
      continue;
    }

    const hv = Number(hLine?.value ?? 0);
    const av = Number(aLine?.value ?? 0);
    if (hv === 0 && av === 0) {
      continue;
    }

    const ht = Number(hLine?.tiebreak ?? NaN);
    const at = Number(aLine?.tiebreak ?? NaN);
    if (Number.isFinite(ht) && Number.isFinite(at)) {
      if (ht > at) {
        homeSets++;
      } else if (at > ht) {
        awaySets++;
      }
      continue;
    }

    const w = inferCompletedSetWinnerFromGames(hv, av);
    if (w === "home") {
      homeSets++;
    } else if (w === "away") {
      awaySets++;
    }
  }

  return [homeSets, awaySets];
}

function linescoresArray(linescores) {
  if (!Array.isArray(linescores)) {
    return [];
  }
  return linescores.map((row, i) => ({
    setIndex: i + 1,
    games: Number(row?.value ?? row?.displayValue ?? 0) || 0,
    tiebreak:
      row?.tiebreak != null && row.tiebreak !== ""
        ? Number(row.tiebreak)
        : row?.displayValue?.includes("TB") || row?.type?.includes?.("tiebreak")
          ? Number(row.tiebreak ?? NaN)
          : null,
    winner: row?.winner === true,
    raw: row,
  }));
}

function statMap(statistics) {
  const out = {};
  if (!Array.isArray(statistics)) {
    return out;
  }
  for (const s of statistics) {
    const key = String(s?.name ?? s?.abbreviation ?? "").toLowerCase().replace(/\s+/g, "");
    const dv = s?.displayValue ?? s?.value;
    if (key && dv != null && dv !== "") {
      out[key] = String(dv);
    }
  }
  return out;
}

/**
 * Guess serving side from ESPN copy (detail often includes "X serving").
 */
function inferServingSide(detailText, awayName, homeName) {
  const t = String(detailText || "").toLowerCase();
  if (!t) {
    return null;
  }
  const m = t.match(/([a-z][a-z\s\.'-]{2,40})\s+serving/i);
  if (!m) {
    return null;
  }
  const frag = m[1].trim().split(/\s+/)[0] ?? "";
  if (frag.length < 2) {
    return null;
  }
  const h = (homeName || "").toLowerCase();
  const a = (awayName || "").toLowerCase();
  if (h.includes(frag) || frag.length >= 3 && h.split(/\s/).some((w) => w.startsWith(frag))) {
    return "home";
  }
  if (a.includes(frag) || frag.length >= 3 && a.split(/\s/).some((w) => w.startsWith(frag))) {
    return "away";
  }
  return null;
}

/**
 * @param {object} competition — ESPN site scoreboard `competitions[]` item
 * @param {[number, number]} setsWon — [awaySets, homeSets] from linescores
 */
export function extractTennisSnapshotFromCompetition(competition, setsWon = [0, 0]) {
  const competitors = competition?.competitors;
  if (!Array.isArray(competitors) || competitors.length < 2) {
    return null;
  }
  const away = competitors.find((c) => c.homeAway === "away");
  const home = competitors.find((c) => c.homeAway === "home");
  if (!away?.athlete || !home?.athlete) {
    return null;
  }

  const awayName = away.athlete.displayName ?? away.athlete.fullName ?? "";
  const homeName = home.athlete.displayName ?? home.athlete.fullName ?? "";
  const detail = competition.status?.type?.detail ?? "";
  const shortDetail = competition.status?.type?.shortDetail ?? "";

  const awayStats = statMap(away.statistics);
  const homeStats = statMap(home.statistics);

  const situation = competition.situation ?? null;
  let servingSide = null;
  if (situation?.lastPlay?.priorityAthlete?.id) {
    const pid = String(situation.lastPlay.priorityAthlete.id);
    if (String(away.athlete?.id ?? "") === pid || String(away.id ?? "") === pid) {
      servingSide = "away";
    }
    if (String(home.athlete?.id ?? "") === pid || String(home.id ?? "") === pid) {
      servingSide = "home";
    }
  }
  if (!servingSide && situation?.server !== undefined) {
    const s = situation.server;
    if (s === 1 || s === "1" || s === "home") {
      servingSide = "home";
    }
    if (s === 2 || s === "2" || s === "away") {
      servingSide = "away";
    }
  }
  servingSide = servingSide ?? inferServingSide(`${detail} ${shortDetail}`, awayName, homeName);

  const awayLines = linescoresArray(away.linescores);
  const homeLines = linescoresArray(home.linescores);

  const pointKeys = ["points", "gamepoints", "currentgamepoints", "pointscore", "game"];
  let awayPoints = awayStats.points ?? awayStats.point ?? "";
  let homePoints = homeStats.points ?? homeStats.point ?? "";
  for (const k of Object.keys(awayStats)) {
    if (pointKeys.some((p) => k.includes(p))) {
      awayPoints = awayStats[k];
      break;
    }
  }
  for (const k of Object.keys(homeStats)) {
    if (pointKeys.some((p) => k.includes(p))) {
      homePoints = homeStats[k];
      break;
    }
  }

  if (!String(awayPoints || "").trim() || !String(homePoints || "").trim()) {
    const parsed = parseGamePointsFromStatusText(detail, shortDetail);
    if (parsed) {
      awayPoints = awayPoints || parsed.away;
      homePoints = homePoints || parsed.home;
    }
  }

  return {
    away: {
      id: String(away.athlete.id ?? away.id ?? ""),
      name: awayName,
      short: away.athlete.shortName ?? awayName.split(" ").pop() ?? awayName,
      linescores: awayLines,
      stats: awayStats,
      pointsDisplay: awayPoints || null,
    },
    home: {
      id: String(home.athlete.id ?? home.id ?? ""),
      name: homeName,
      short: home.athlete.shortName ?? homeName.split(" ").pop() ?? homeName,
      linescores: homeLines,
      stats: homeStats,
      pointsDisplay: homePoints || null,
    },
    setsWon: { away: setsWon[0], home: setsWon[1] },
    statusDetail: detail,
    shortDetail,
    period: competition.status?.period ?? null,
    servingSide,
    situation,
    court: competition.venue?.court ?? null,
    roundName: competition.round?.displayName ?? null,
    formatPeriods: competition.format?.regulation?.periods ?? 3,
    lastPlayText: situation?.lastPlay?.text ?? null,
  };
}

/** Prefer the side snapshot whose linescores array is longer (usually richer scoreboard vs sparse summary). */
function preferLinescores(sideSb, sideSum) {
  const la = sideSb?.linescores?.length ?? 0;
  const lb = sideSum?.linescores?.length ?? 0;
  if (lb > la) {
    return sideSum?.linescores ?? [];
  }
  if (la > 0) {
    return sideSb?.linescores ?? [];
  }
  return sideSum?.linescores ?? sideSb?.linescores ?? [];
}

export function mergeTennisSnapshots(scoreboardSnap, summarySnap) {
  if (!summarySnap) {
    return scoreboardSnap;
  }
  if (!scoreboardSnap) {
    return summarySnap;
  }
  return {
    ...scoreboardSnap,
    ...summarySnap,
    away: {
      ...scoreboardSnap.away,
      ...summarySnap.away,
      linescores: preferLinescores(scoreboardSnap.away, summarySnap.away),
      pointsDisplay: summarySnap.away?.pointsDisplay || scoreboardSnap.away?.pointsDisplay || null,
    },
    home: {
      ...scoreboardSnap.home,
      ...summarySnap.home,
      linescores: preferLinescores(scoreboardSnap.home, summarySnap.home),
      pointsDisplay: summarySnap.home?.pointsDisplay || scoreboardSnap.home?.pointsDisplay || null,
    },
    // Live scoreboard feed is authoritative for completed-set totals; summary can lag or omit winner flags.
    setsWon: scoreboardSnap.setsWon ?? summarySnap.setsWon,
    servingSide: summarySnap.servingSide ?? scoreboardSnap.servingSide,
    lastPlayText: summarySnap.lastPlayText ?? scoreboardSnap.lastPlayText,
    statusDetail: summarySnap.statusDetail || scoreboardSnap.statusDetail,
    shortDetail: summarySnap.shortDetail || scoreboardSnap.shortDetail,
  };
}
