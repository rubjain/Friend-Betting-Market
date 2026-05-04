"use client";

import { useState } from "react";

const PLAYER_COL_PREF = ["MIN", "PTS", "FG", "3PT", "FT", "REB", "AST", "TO", "STL", "BLK", "OREB", "DREB", "PF", "+/-"];

function pickPlayerColumns(sampleStats) {
  const keys = Object.keys(sampleStats || {});
  const ordered = [];
  for (const p of PLAYER_COL_PREF) {
    if (keys.includes(p)) {
      ordered.push(p);
    }
  }
  for (const k of keys) {
    if (!ordered.includes(k)) {
      ordered.push(k);
    }
  }
  return ordered;
}

function PlayerTeamTable({ label, side }) {
  const players = side?.players ?? [];
  const sample = players.find((p) => p.stats && Object.keys(p.stats).length)?.stats ?? {};
  const cols = pickPlayerColumns(sample);

  if (!players.length || !cols.length) {
    return null;
  }

  return (
    <div className="live-box-score-player-team">
      <h4 className="live-box-score-player-team-title">{label}</h4>
      <div className="live-box-score-player-scroll">
        <table className="live-box-score-player-table">
          <thead>
            <tr>
              <th scope="col" className="live-box-score-player-name-col">
                Player
              </th>
              {cols.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.name}>
                <td className="live-box-score-player-name-col">
                  {p.starter ? <span className="live-box-score-starter" title="Starter" /> : null}
                  {p.shortName || p.name}
                </td>
                {cols.map((c) => (
                  <td key={c}>{p.stats[c] ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * @param {{ game: object, playerBox?: { away?: object, home?: object } | null }} props
 */
export default function LiveBoxScore({ game, playerBox }) {
  const [boxSub, setBoxSub] = useState("team");
  const bx = game?.boxScore;

  const hasTeamLines =
    bx?.away?.linescore &&
    bx?.home?.linescore &&
    Array.isArray(bx.away.linescore) &&
    Array.isArray(bx.home.linescore);

  const hasPlayerFeed =
    (playerBox?.away?.players?.length ?? 0) > 0 || (playerBox?.home?.players?.length ?? 0) > 0;

  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const away = bx?.away;
  const home = bx?.home;

  return (
    <div className="live-box-score-wrap">
      <div className="live-box-score-subtabs" role="tablist" aria-label="Box score type">
        <button
          type="button"
          role="tab"
          aria-selected={boxSub === "team"}
          className={boxSub === "team" ? "is-active" : ""}
          onClick={() => setBoxSub("team")}
        >
          Team
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={boxSub === "players"}
          className={boxSub === "players" ? "is-active" : ""}
          onClick={() => setBoxSub("players")}
        >
          Players
        </button>
      </div>

      {boxSub === "team" ? (
        <div className="live-box-score" role="tabpanel">
          {!hasTeamLines ? (
            <p className="live-box-score-empty">Quarter lines and team totals appear when the feed includes full linescore data.</p>
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
      ) : (
        <div className="live-box-score live-box-score--players" role="tabpanel">
          {hasPlayerFeed ? (
            <div className="live-box-score-player-panels">
              <PlayerTeamTable label={`${game.awayAbbr ?? "Away"} · ${playerBox?.away?.teamName ?? game.awayTeam ?? ""}`} side={playerBox?.away} />
              <PlayerTeamTable label={`${game.homeAbbr ?? "Home"} · ${playerBox?.home?.teamName ?? game.homeTeam ?? ""}`} side={playerBox?.home} />
            </div>
          ) : game.topPerformers?.length ? (
            <div className="live-box-score-top live-box-score-top--solo">
              <span className="label">Player highlights</span>
              <p className="live-box-score-muted">Full player lines load when the live summary feed is connected.</p>
              <ul>
                {game.topPerformers.map((p) => (
                  <li key={`${p.name}-${p.team}`}>
                    <strong>{p.name}</strong> ({p.team}) — {p.line}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="live-box-score-empty">Player stats load from the live summary feed when a game is linked.</p>
          )}
        </div>
      )}
    </div>
  );
}
