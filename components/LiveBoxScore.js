"use client";

/**
 * Renders quarter lines + team totals when `game.boxScore` is present (NBA demo shape).
 */
export default function LiveBoxScore({ game }) {
  const bx = game?.boxScore;
  if (!bx?.away?.linescore || !bx?.home?.linescore) {
    return null;
  }

  const quarters = ["Q1", "Q2", "Q3", "Q4"];
  const away = bx.away;
  const home = bx.home;

  return (
    <div className="live-box-score">
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
