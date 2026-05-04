"use client";

import { useEffect, useMemo, useState } from "react";
import { getLiveGameClock } from "../lib/marketAlgorithms";
import { getGameMarketCategory } from "../lib/gameMarkets";
import { sortPlaysNewestFirst } from "../lib/espnSummaryNormalize";
import { mergeTennisSnapshots } from "../lib/tennisScoreboard";
import LiveBoxScore from "./LiveBoxScore";
import TennisMatchBoard from "./TennisMatchBoard";

function leagueToApiParam(league) {
  const L = String(league || "").toUpperCase();
  if (L === "NBA") return "nba";
  if (L === "NFL") return "nfl";
  if (L === "MLB") return "mlb";
  if (L === "NHL") return "nhl";
  return "nba";
}

/**
 * @param {{ market?: object, game: object, bettingPanel?: React.ReactNode }} props
 *   bettingPanel — optional slot rendered inside the Betting tab (LiveGameDetailPage only)
 */
export default function MarketGamePanel({ market, game, bettingPanel }) {
  const headline = market?.title ?? `${game.awayTeam} at ${game.homeTeam}`;
  const category = market?.category ?? getGameMarketCategory(game);
  const [tab, setTab] = useState("pbp");
  const [remotePlays, setRemotePlays] = useState([]);
  const [playerBox, setPlayerBox] = useState(null);
  const [tennisBoard, setTennisBoard] = useState(null);
  const [feedError, setFeedError] = useState(false);

  const leagueParam = useMemo(() => leagueToApiParam(game.league), [game.league]);
  const eventId = game.espnEventId;

  // ── Live summary poll (5s for plays + tennis, 30s for player box) ──────
  useEffect(() => {
    if (!eventId) {
      setRemotePlays([]);
      setPlayerBox(null);
      setTennisBoard(null);
      return undefined;
    }
    let canceled = false;
    let boxPollCount = 0;

    async function load() {
      try {
        const qs = new URLSearchParams();
        qs.set("event", eventId);
        if (game.espnSummaryPath) {
          qs.set("path", game.espnSummaryPath);
        } else {
          qs.set("league", leagueParam);
        }
        const res = await fetch(`/api/live/summary?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (canceled) return;
        setFeedError(!!data.feedError);
        setRemotePlays(Array.isArray(data.plays) ? data.plays : []);
        setTennisBoard(data.tennisBoard ?? null);
        // Refresh player box on first load and then every ~6 ticks (30s)
        if (data.playerBox && (boxPollCount === 0 || boxPollCount % 6 === 0)) {
          setPlayerBox(data.playerBox);
        }
        boxPollCount++;
      } catch {
        if (!canceled) {
          setFeedError(true);
          setRemotePlays([]);
          setTennisBoard(null);
        }
      }
    }
    void load();
    const id = window.setInterval(load, 5_000);
    return () => {
      canceled = true;
      window.clearInterval(id);
    };
  }, [eventId, leagueParam, game.espnSummaryPath]);

  const playRows = useMemo(() => {
    if (remotePlays.length > 0) {
      return sortPlaysNewestFirst(remotePlays);
    }
    const fallback = (game.updates || []).map((text, i) => ({
      id: `desk-${i}`,
      text,
      periodLabel: "",
      clockLabel: "",
      awayScore: game.awayScore,
      homeScore: game.homeScore,
      wallclock: null,
      sequenceNumber: 1000000 - i,
    }));
    return sortPlaysNewestFirst(fallback);
  }, [remotePlays, game]);

  const isTennis =
    typeof game.id === "string" &&
    (game.id.startsWith("espn_tennis_") || String(game.espnSummaryPath || "").startsWith("tennis/"));

  const mergedTennis = useMemo(
    () => mergeTennisSnapshots(game.tennis ?? null, tennisBoard),
    [game.tennis, tennisBoard],
  );

  const isLive = game.status === "live";
  const clock = getLiveGameClock(game);
  const showBettingTab = !!bettingPanel;
  const TABS = showBettingTab
    ? [{ id: "pbp", label: "Play-by-play" }, { id: "box", label: "Box score" }, { id: "bet", label: "Betting" }]
    : [{ id: "pbp", label: "Play-by-play" }, { id: "box", label: "Box score" }];

  return (
    <div className={`market-game-panel ${isLive ? "market-game-panel--live" : ""}`}>
      <div className="market-game-panel-head">
        <h2 className="market-game-panel-title">{headline}</h2>
        <div className="market-game-panel-meta">
          <span>{game.league}</span>
          <span className="market-game-panel-clock">{clock}</span>
          {game.lastUpdated ? (
            <span className="market-game-panel-updated">Updated {new Date(game.lastUpdated).toLocaleTimeString()}</span>
          ) : null}
        </div>
      </div>

      <div className="market-game-score-strip" aria-label="Current score">
        <div className="market-game-score-team">
          <span className="market-game-score-abbr">{game.awayAbbr ?? game.awayTeam}</span>
          <strong>{game.awayScore}</strong>
          <span className="market-game-score-long">{game.awayTeam}</span>
        </div>
        <div className="market-game-score-divider">@</div>
        <div className="market-game-score-team market-game-score-team--home">
          <span className="market-game-score-abbr">{game.homeAbbr ?? game.homeTeam}</span>
          <strong>{game.homeScore}</strong>
          <span className="market-game-score-long">{game.homeTeam}</span>
        </div>
      </div>

      {game.feedStatus ? <p className="market-game-feed-line">{game.feedStatus}</p> : null}
      {game.broadcast ? <p className="market-game-broadcast">{game.broadcast}</p> : null}

      {isTennis ? (
        <TennisMatchBoard
          snapshot={mergedTennis}
          game={game}
          plays={playRows}
          feedError={feedError}
          hasRemotePlays={remotePlays.length > 0}
        />
      ) : (
        <>
          {/* ── Tab bar ────────────────────────────────────────── */}
          <div className="mgp-tabs" role="tablist" aria-label="Game detail tabs">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`mgp-tab${tab === id ? " mgp-tab--active" : ""}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Play-by-play ────────────────────────────────────── */}
          {tab === "pbp" ? (
            <div className="market-game-tab-panel" role="tabpanel">
              {feedError && !remotePlays.length ? (
                <p className="market-game-pbp-note">Live play-by-play feed unavailable; showing desk updates.</p>
              ) : null}
              {!remotePlays.length && playRows.length && category === "MLB" ? (
                <p className="market-game-pbp-note">
                  MLB play-by-play loads from the desk until a pitch-by-pitch feed is wired; scores still refresh with the game.
                </p>
              ) : null}
              <ul className="market-game-pbp-list">
                {playRows.map((row) => (
                  <li key={row.id} className="market-game-pbp-item">
                    <div className="market-game-pbp-scores">
                      <span>{row.awayScore ?? game.awayScore}</span>
                      <span className="market-game-pbp-dash">–</span>
                      <span>{row.homeScore ?? game.homeScore}</span>
                    </div>
                    <div className="market-game-pbp-main">
                      <div className="market-game-pbp-meta">
                        {[row.periodLabel, row.clockLabel].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div className="market-game-pbp-text">{row.text}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* ── Box score ───────────────────────────────────────── */}
          {tab === "box" ? (
            <div className="market-game-tab-panel" role="tabpanel">
              <LiveBoxScore game={game} playerBox={playerBox} />
            </div>
          ) : null}

          {/* ── Betting ─────────────────────────────────────────── */}
          {tab === "bet" ? (
            <div className="market-game-tab-panel market-game-tab-panel--betting" role="tabpanel">
              {bettingPanel ?? (
                <p className="market-game-pbp-note">No prediction market linked to this game.</p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
