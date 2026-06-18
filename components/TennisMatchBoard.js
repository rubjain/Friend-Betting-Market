"use client";

import { useMemo } from "react";
import { parseGamePointsFromStatusText, sortTennisPointHistory } from "../lib/tennisPointParsing.js";

/** Minimal racket outline; uses `currentColor` for serve accent. */
function ServeRacketIcon() {
  return (
    <svg className="tennis-racket-icon" viewBox="0 0 24 24" width={14} height={14} aria-hidden="true" focusable="false">
      <ellipse cx="10.5" cy="9" rx="6.5" ry="7.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14.5 14.5 L20.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Kalshi-style tennis scoreboard + live game points + chronological point history.
 */
export default function TennisMatchBoard({ snapshot, game, plays = [], feedError = false, hasRemotePlays = false }) {
  const parsedFromStatus = useMemo(
    () => parseGamePointsFromStatusText(snapshot?.statusDetail, snapshot?.shortDetail),
    [snapshot?.statusDetail, snapshot?.shortDetail],
  );
  const historyOrdered = useMemo(() => sortTennisPointHistory(plays), [plays]);

  if (!snapshot?.away || !snapshot?.home) {
    return (
      <div className="tennis-board tennis-board--empty">
        <p className="caption">Tennis lines load when the live feed includes full match data.</p>
      </div>
    );
  }

  const { away, home } = snapshot;
  const nSets = Math.max(away.linescores?.length ?? 0, home.linescores?.length ?? 0, snapshot.formatPeriods ?? 3);
  const setCount = Math.min(Math.max(nSets, 1), 5);

  const statusLine = [snapshot.shortDetail, snapshot.statusDetail].filter(Boolean).join(" · ") || game.clock;

  const awayPtsRaw = away.pointsDisplay || parsedFromStatus?.away;
  const homePtsRaw = home.pointsDisplay || parsedFromStatus?.home;
  const pointsAway = awayPtsRaw && String(awayPtsRaw).trim() ? awayPtsRaw : "—";
  const pointsHome = homePtsRaw && String(homePtsRaw).trim() ? homePtsRaw : "—";

  const statusBlob = `${snapshot.statusDetail || ""} ${snapshot.shortDetail || ""}`;
  const isDeuce =
    (pointsAway === "40" && pointsHome === "40") ||
    pointsAway === "Deuce" ||
    pointsHome === "Deuce" ||
    (/\bdeuce\b/i.test(statusBlob) && !/\badvantage\b/i.test(statusBlob));

  return (
    <div className="tennis-board">
      <div className="tennis-board-meta">
        {snapshot.roundName ? <span className="tennis-board-chip">{snapshot.roundName}</span> : null}
        {snapshot.court ? <span className="tennis-board-chip">{snapshot.court}</span> : null}
        <span className="tennis-board-chip tennis-board-chip--muted">Updates every 5s</span>
      </div>

      <div className="tennis-board-sets-summary" aria-label="Sets won">
        <span className="tennis-board-sets-label">Sets</span>
        <strong className="tennis-board-sets-score">
          {snapshot.setsWon?.away ?? game.awayScore}–{snapshot.setsWon?.home ?? game.homeScore}
        </strong>
      </div>

      {statusLine ? <p className="tennis-board-status">{statusLine}</p> : null}

      <div className="tennis-board-scroll">
        <table className="tennis-board-table">
          <thead>
            <tr>
              <th scope="col" className="tennis-board-col-player">
                Player
              </th>
              {Array.from({ length: setCount }, (_, i) => (
                <th key={`s-h-${i}`} scope="col" className="tennis-board-col-set">
                  S{i + 1}
                </th>
              ))}
              <th scope="col" className="tennis-board-col-pts">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="tennis-board-player">
                <span className="tennis-board-name">{away.short || away.name}</span>
                {snapshot.servingSide === "away" ? (
                  <span className="tennis-board-serve" title="Serving">
                    <ServeRacketIcon />
                    <span className="visually-hidden">Serving</span>
                  </span>
                ) : null}
              </td>
              {Array.from({ length: setCount }, (_, i) => {
                const cell = away.linescores?.[i];
                const games = cell?.games;
                const tb = cell?.tiebreak;
                const label = games != null ? String(games) : "—";
                const cellText = tb != null && Number.isFinite(tb) ? `${label} (${tb})` : label;
                return (
                  <td key={`a-${i}`} className="tennis-board-cell-set">
                    {cellText}
                  </td>
                );
              })}
              <td className="tennis-board-cell-pts">{pointsAway}</td>
            </tr>
            <tr>
              <td className="tennis-board-player">
                <span className="tennis-board-name">{home.short || home.name}</span>
                {snapshot.servingSide === "home" ? (
                  <span className="tennis-board-serve" title="Serving">
                    <ServeRacketIcon />
                    <span className="visually-hidden">Serving</span>
                  </span>
                ) : null}
              </td>
              {Array.from({ length: setCount }, (_, i) => {
                const cell = home.linescores?.[i];
                const games = cell?.games;
                const tb = cell?.tiebreak;
                const label = games != null ? String(games) : "—";
                const cellText = tb != null && Number.isFinite(tb) ? `${label} (${tb})` : label;
                return (
                  <td key={`h-${i}`} className="tennis-board-cell-set">
                    {cellText}
                  </td>
                );
              })}
              <td className="tennis-board-cell-pts">{pointsHome}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="tennis-board-lower" aria-label="Live game and point log">
        <div className="tennis-board-current-game" aria-live="polite">
          <div className="tennis-board-current-game-label">Current game (points)</div>
          <div className="tennis-board-current-game-inner">
            <div className="tennis-board-current-player">
              <span className="tennis-board-current-abbr">{away.short || away.name}</span>
              <strong className="tennis-board-current-pt">{pointsAway}</strong>
            </div>
            <span className="tennis-board-current-vs" aria-hidden="true">
              {isDeuce ? "Deuce" : "–"}
            </span>
            <div className="tennis-board-current-player tennis-board-current-player--home">
              <strong className="tennis-board-current-pt">{pointsHome}</strong>
              <span className="tennis-board-current-abbr">{home.short || home.name}</span>
            </div>
          </div>
        </div>

        {snapshot.lastPlayText ? (
          <p className="tennis-board-last-play">
            <span className="label">Last rally</span> {snapshot.lastPlayText}
          </p>
        ) : null}

        <div className="tennis-point-history">
        <h4 className="tennis-point-history-title">Point history</h4>
        {feedError && !hasRemotePlays ? (
          <p className="caption tennis-point-history-note">
            Match summary feed unavailable — showing desk lines only. Live point history fills in when ESPN returns match plays.
          </p>
        ) : null}
        {!feedError && !hasRemotePlays && historyOrdered.length ? (
          <p className="caption tennis-point-history-note">Desk updates (newest lines may appear first in the feed).</p>
        ) : null}
        {historyOrdered.length ? (
          <ol className="tennis-point-history-list" aria-label="Points in chronological order">
            {historyOrdered.map((row) => (
              <li key={row.id} className="tennis-point-history-item">
                <span className="tennis-point-history-meta">
                  {[row.periodLabel, row.clockLabel].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="tennis-point-history-text">{row.text}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="caption tennis-point-history-empty">
            No point log yet — history appears when the summary feed returns rally-by-rally rows (polled every 5 seconds).
          </p>
        )}
        </div>
      </div>
    </div>
  );
}
