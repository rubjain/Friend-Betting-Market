"use client";

import { useMemo, useState } from "react";

// ── Column preference lists per sport / group ─────────────────────────────
const NBA_COLS    = ["MIN", "PTS", "REB", "AST", "STL", "BLK", "FG", "3PT", "FT", "+/-"];
const NFL_PASS    = ["C/ATT", "YDS", "AVG", "TD", "INT", "QBR", "RTG"];
const NFL_RUSH    = ["CAR", "YDS", "AVG", "TD", "LNG"];
const NFL_REC     = ["REC", "TGT", "YDS", "AVG", "TD", "LNG"];
const NFL_DEF     = ["TOT", "SOLO", "SACKS", "TFL", "INT", "PD", "FF"];
const MLB_BAT     = ["AB", "R", "H", "RBI", "BB", "SO", "AVG", "OBP", "SLG"];
const MLB_PITCH   = ["IP", "H", "R", "ER", "BB", "SO", "HR", "ERA", "WHIP"];
const NHL_SKATE   = ["G", "A", "PTS", "+/-", "SOG", "HIT", "BLK", "TOI"];
const NHL_GOALIE  = ["SA", "SV", "GA", "SV%", "TOI"];

// Groups to suppress (less useful for viewers)
const SUPPRESSED_GROUPS = new Set(["fumbles", "kicking", "punting", "kickoff returns", "punt returns"]);

function colPrefsForGroup(league, label) {
  const L = String(league || "").toUpperCase();
  const g = String(label || "").toLowerCase();
  if (L === "NFL") {
    if (g.includes("pass")) return NFL_PASS;
    if (g.includes("rush")) return NFL_RUSH;
    if (g.includes("receiv")) return NFL_REC;
    if (g.includes("def") || g.includes("intercept")) return NFL_DEF;
    return null;
  }
  if (L === "MLB") {
    if (g.includes("pitch")) return MLB_PITCH;
    return MLB_BAT;
  }
  if (L === "NHL") {
    if (g.includes("goal") || g.includes("goaltend")) return NHL_GOALIE;
    return NHL_SKATE;
  }
  return NBA_COLS; // NBA / fallback
}

/** Reorder columns by preference list; unknowns appended at end. */
function orderCols(espnNames, prefs) {
  if (!prefs) return espnNames;
  const upper = (s) => String(s).toUpperCase();
  const prefsUp = prefs.map(upper);
  const ordered = [];
  for (const p of prefsUp) {
    const match = espnNames.find((n) => upper(n) === p);
    if (match && !ordered.includes(match)) ordered.push(match);
  }
  for (const n of espnNames) {
    if (!ordered.includes(n)) ordered.push(n);
  }
  return ordered;
}

/** Best numeric stat value in a player's stats object (for top-performer detection). */
function primaryStatValue(stats, cols) {
  // Use the second column after MIN/PLAYER as the key stat
  const candidates = (cols || Object.keys(stats)).filter(
    (c) => !["MIN", "TOI", "C/ATT", "IP"].includes(c.toUpperCase()),
  );
  const key = candidates[0];
  if (!key) return 0;
  const raw = String(stats[key] ?? "0");
  // Handle "8-15" FG format — use first number
  return parseFloat(raw.split(/[-/]/)[0]) || 0;
}

// ── Single player row ─────────────────────────────────────────────────────
function PlayerRow({ player, cols, isTop }) {
  return (
    <tr className={`pbs-player-row${isTop ? " pbs-player-row--top" : ""}`}>
      <td className="pbs-name-cell">
        {player.starter ? <span className="pbs-starter-dot" title="Starter" /> : null}
        <span className={player.starter ? "pbs-name--starter" : ""}>{player.shortName || player.name}</span>
      </td>
      {cols.map((c) => (
        <td key={c} className="pbs-stat-cell">
          {player.stats[c] ?? "—"}
        </td>
      ))}
    </tr>
  );
}

// ── DNP row ───────────────────────────────────────────────────────────────
function DnpRow({ name }) {
  return (
    <tr className="pbs-dnp-row">
      <td colSpan={999} className="pbs-dnp-cell">
        {name} — DNP
      </td>
    </tr>
  );
}

// ── Bench divider ─────────────────────────────────────────────────────────
function BenchDivider({ colCount }) {
  return (
    <tr className="pbs-bench-divider">
      <td colSpan={colCount + 1} className="pbs-bench-cell">
        BENCH
      </td>
    </tr>
  );
}

// ── One team's player table for a given stat group ────────────────────────
function GroupTable({ side, groupIdx, league }) {
  const group = side?.groups?.[groupIdx] ?? null;
  const prefs = useMemo(() => colPrefsForGroup(league, group?.label), [league, group?.label]);
  const cols = useMemo(() => orderCols(group?.names ?? [], prefs), [group?.names, prefs]);

  const activePlayers = useMemo(() => (group?.players ?? []).filter((p) => !p.didNotPlay), [group]);
  const dnpPlayers    = useMemo(() => (group?.players ?? []).filter((p) => p.didNotPlay),  [group]);
  const starters      = useMemo(() => activePlayers.filter((p) => p.starter),  [activePlayers]);
  const bench         = useMemo(() => activePlayers.filter((p) => !p.starter), [activePlayers]);
  const hasBench      = starters.length > 0 && bench.length > 0;

  // Top performer = player with highest value in the primary stat column
  const topPlayer = useMemo(() => {
    if (!activePlayers.length) return null;
    return activePlayers.reduce(
      (best, p) =>
        primaryStatValue(p.stats, cols) > primaryStatValue(best.stats, cols) ? p : best,
      activePlayers[0],
    );
  }, [activePlayers, cols]);

  if (!group || (!activePlayers.length && !dnpPlayers.length)) return null;

  const rows = hasBench
    ? [...starters, null /* bench divider */, ...bench]
    : activePlayers;

  return (
    <div className="pbs-team-table-wrap">
      <div className="pbs-scroll">
        <table className="pbs-table">
          <thead>
            <tr className="pbs-header-row">
              <th className="pbs-name-header">PLAYER</th>
              {cols.map((c) => (
                <th key={c} className="pbs-stat-header">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) =>
              p === null ? (
                <BenchDivider key="bench" colCount={cols.length} />
              ) : (
                <PlayerRow
                  key={p.name}
                  player={p}
                  cols={cols}
                  isTop={p === topPlayer}
                />
              ),
            )}
            {dnpPlayers.map((p) => (
              <DnpRow key={p.name} name={p.shortName || p.name} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Players sub-tab content ───────────────────────────────────────────────
function PlayersTab({ playerBox, game, league }) {
  const away = playerBox?.away;
  const home = playerBox?.home;

  // Build unified group label list (away drives if available)
  const allGroups = (away ?? home)?.groups ?? [];
  const visibleGroups = allGroups.filter(
    (g) => !SUPPRESSED_GROUPS.has(String(g.label ?? "").toLowerCase()),
  );

  const [activeGroup, setActiveGroup] = useState(0);
  const showGroupTabs = visibleGroups.length > 1;

  const resolvedIdx = showGroupTabs
    ? (away ?? home)?.groups.findIndex(
        (g) => g.label === visibleGroups[activeGroup]?.label,
      ) ?? activeGroup
    : 0;

  if (!away && !home) {
    return (
      <p className="pbs-empty">
        Player stats load from the live summary feed when a game is linked.
      </p>
    );
  }

  return (
    <div className="pbs-players-root">
      {showGroupTabs ? (
        <div className="pbs-group-tabs">
          {visibleGroups.map((g, i) => (
            <button
              key={g.label ?? i}
              type="button"
              className={`pbs-group-tab${activeGroup === i ? " pbs-group-tab--active" : ""}`}
              onClick={() => setActiveGroup(i)}
            >
              {g.label ?? `Group ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}

      {[
        { side: away, abbr: game?.awayAbbr ?? "Away", teamName: away?.teamName ?? game?.awayTeam ?? "" },
        { side: home, abbr: game?.homeAbbr ?? "Home", teamName: home?.teamName ?? game?.homeTeam ?? "" },
      ].map(({ side, abbr, teamName }) =>
        side ? (
          <div key={abbr} className="pbs-team-section">
            <div className="pbs-team-header">
              <span className="pbs-team-abbr">{abbr}</span>
              {teamName && abbr !== teamName ? (
                <span className="pbs-team-name">{teamName}</span>
              ) : null}
            </div>
            <GroupTable
              side={side}
              groupIdx={resolvedIdx}
              league={league}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}

// ── Team linescore tab (unchanged) ────────────────────────────────────────
function TeamTab({ game }) {
  const bx = game?.boxScore;
  const hasTeamLines =
    bx?.away?.linescore &&
    bx?.home?.linescore &&
    Array.isArray(bx.away.linescore) &&
    Array.isArray(bx.home.linescore);
  const away = bx?.away;
  const home = bx?.home;
  const quarters = ["Q1", "Q2", "Q3", "Q4"];

  return (
    <div className="live-box-score" role="tabpanel">
      {!hasTeamLines ? (
        <p className="live-box-score-empty">
          Quarter lines and team totals appear when the feed includes full linescore data.
        </p>
      ) : (
        <>
          <div className="live-box-score-head">
            <span />
            {quarters.map((q) => (
              <span key={q}>{q}</span>
            ))}
            <span>TOT</span>
          </div>
          <div className="live-box-score-row">
            <strong>{game.awayAbbr ?? game.awayTeam}</strong>
            {away.linescore.map((cell, i) => (
              <span key={`a-${i}`}>{cell ?? "—"}</span>
            ))}
            <strong>{game.awayScore}</strong>
          </div>
          <div className="live-box-score-row">
            <strong>{game.homeAbbr ?? game.homeTeam}</strong>
            {home.linescore.map((cell, i) => (
              <span key={`h-${i}`}>{cell ?? "—"}</span>
            ))}
            <strong>{game.homeScore}</strong>
          </div>
          <div className="live-box-score-stats">
            <div>
              <span className="label">{game.awayAbbr}</span>
              <span>{away.totals?.fg} FG</span>
              <span>{away.totals?.tp} 3PT</span>
              <span>{away.totals?.reb} REB</span>
              <span>{away.totals?.ast} AST</span>
            </div>
            <div>
              <span className="label">{game.homeAbbr}</span>
              <span>{home.totals?.fg} FG</span>
              <span>{home.totals?.tp} 3PT</span>
              <span>{home.totals?.reb} REB</span>
              <span>{home.totals?.ast} AST</span>
            </div>
          </div>
        </>
      )}
      {game.topPerformers?.length ? (
        <div className="live-box-score-top">
          <span className="label">Top performers</span>
          <ul>
            {game.topPerformers.map((p) => (
              <li key={`${p.name}-${p.team}`}>
                <strong>{p.name}</strong> ({p.team}) — {p.line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ── Derive league string from game id ─────────────────────────────────────
function leagueFromGame(game) {
  const id = String(game?.id ?? "");
  if (id.includes("_nba_")) return "NBA";
  if (id.includes("_nfl_")) return "NFL";
  if (id.includes("_mlb_")) return "MLB";
  if (id.includes("_nhl_")) return "NHL";
  return String(game?.league ?? "").toUpperCase();
}

// ── Root export ───────────────────────────────────────────────────────────
export default function LiveBoxScore({ game, playerBox }) {
  const [boxSub, setBoxSub] = useState("team");
  const league = leagueFromGame(game);

  return (
    <div className="live-box-score-wrap">
      <div className="live-box-score-subtabs" role="tablist" aria-label="Box score type">
        {["team", "players"].map((sub) => (
          <button
            key={sub}
            type="button"
            role="tab"
            aria-selected={boxSub === sub}
            className={boxSub === sub ? "is-active" : ""}
            onClick={() => setBoxSub(sub)}
          >
            {sub.charAt(0).toUpperCase() + sub.slice(1)}
          </button>
        ))}
      </div>

      {boxSub === "team" ? (
        <TeamTab game={game} />
      ) : (
        <PlayersTab playerBox={playerBox} game={game} league={league} />
      )}
    </div>
  );
}
