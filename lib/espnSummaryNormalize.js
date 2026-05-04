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
  return [];
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
