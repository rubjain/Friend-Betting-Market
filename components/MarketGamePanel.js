"use client";

import { useEffect, useMemo, useState } from "react";
import { getLiveGameClock } from "../lib/marketAlgorithms";
import { sortPlaysNewestFirst } from "../lib/espnSummaryNormalize";
import LiveBoxScore from "./LiveBoxScore";

function leagueToApiParam(league) {
  const L = String(league || "").toUpperCase();
  if (L === "NBA") return "nba";
  if (L === "NFL") return "nfl";
  if (L === "MLB") return "mlb";
  if (L === "NHL") return "nhl";
  return "nba";
}

export default function MarketGamePanel({ market, game }) {
  const [tab, setTab] = useState("pbp");
  const [remotePlays, setRemotePlays] = useState([]);
  const [playerBox, setPlayerBox] = useState(null);
  const [feedError, setFeedError] = useState(false);

  const leagueParam = useMemo(() => leagueToApiParam(game.league), [game.league]);
  const eventId = game.espnEventId;

  useEffect(() => {
    if (!eventId) {
      setRemotePlays([]);
      setPlayerBox(null);
      return undefined;
    }
    let canceled = false;
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
        setPlayerBox(data.playerBox ?? null);
      } catch {
        if (!canceled) {
          setFeedError(true);
          setRemotePlays([]);
          setPlayerBox(null);
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

  const isLive = game.status === "live";
  const clock = getLiveGameClock(game);

  return (
    <div className={`market-game-panel ${isLive ? "market-game-panel--live" : ""}`}>
      <div className="market-game-panel-head">
        <h2 className="market-game-panel-title">{market.title}</h2>
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

      <div className="market-game-tabs" role="tablist" aria-label="Game detail tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "pbp"}
          className={tab === "pbp" ? "is-active" : ""}
          onClick={() => setTab("pbp")}
        >
          Play-by-play
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "box"}
          className={tab === "box" ? "is-active" : ""}
          onClick={() => setTab("box")}
        >
          Box score
        </button>
      </div>

      {tab === "pbp" ? (
        <div className="market-game-tab-panel" role="tabpanel">
          {feedError && !remotePlays.length ? (
            <p className="market-game-pbp-note">Live play-by-play feed unavailable; showing desk updates.</p>
          ) : null}
          {!remotePlays.length && playRows.length && market.category === "MLB" ? (
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

      {tab === "box" ? (
        <div className="market-game-tab-panel" role="tabpanel">
          <LiveBoxScore game={game} playerBox={playerBox} />
        </div>
      ) : null}
    </div>
  );
}
