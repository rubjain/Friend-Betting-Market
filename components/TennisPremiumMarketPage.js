"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BettingPanel from "./BettingPanel";
import TennisWinProbChart from "./TennisWinProbChart";
import { useAgora } from "../context/AgoraContext";
import { mergeTennisSnapshots } from "../lib/tennisScoreboard";
import { parseGamePointsFromStatusText } from "../lib/tennisPointParsing.js";
import { getLinkedLiveGame } from "../lib/marketAlgorithms";
import { money } from "../lib/formatters";

// ── ATP logo mark ──────────────────────────────────────────
function AtpLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="ATP">
      <rect width="32" height="32" rx="6" fill="#0a2240" />
      <text x="16" y="22" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800" fontFamily="Inter,sans-serif">
        ATP
      </text>
    </svg>
  );
}

// ── Pulsing live dot ───────────────────────────────────────
function LiveDot() {
  return (
    <span className="tp-live-dot-wrap" aria-hidden="true">
      <span className="tp-live-dot" />
    </span>
  );
}

// ── Flag placeholder ───────────────────────────────────────
function FlagPlaceholder() {
  return <span className="tp-flag-placeholder" aria-hidden="true" />;
}

// ── Racket icon for serve ──────────────────────────────────
function ServeRacket() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="10.5" cy="9" rx="6.5" ry="7.5" stroke="#F55D00" strokeWidth="1.8" />
      <path d="M14.5 14.5 L20.5 22" stroke="#F55D00" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function TennisPremiumMarketPage({ marketId }) {
  const { state, actions, selectors } = useAgora();
  const market = selectors.getSelectedMarket(marketId);
  const linkedGame = useMemo(
    () => (market ? getLinkedLiveGame(market, state.liveGames) : null),
    [market, state.liveGames],
  );

  // polling state (mirrors MarketGamePanel logic)
  const [tennisBoard, setTennisBoard] = useState(null);
  const [remotePlays, setRemotePlays] = useState([]);
  const [feedError, setFeedError] = useState(false);

  // probability history: [{ts, p1, p2}]
  const [probHistory, setProbHistory] = useState([]);

  // point log: [{id, ts, text, type}]
  const [pointLog, setPointLog] = useState([]);
  const seenPlayIds = useRef(new Set());

  const eventId = linkedGame?.espnEventId;

  // Seed initial prob point from market price
  useEffect(() => {
    if (market?.yesPrice != null) {
      setProbHistory([{ ts: Date.now(), p1: market.yesPrice, p2: market.noPrice ?? 1 - market.yesPrice }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set selected market
  useEffect(() => {
    if (market?.id && state.selectedMarketId !== market.id) {
      actions.setSelectedMarket(market.id);
    }
  }, [actions, market?.id, state.selectedMarketId]);

  // Poll ESPN summary every 5s (same cadence as MarketGamePanel)
  useEffect(() => {
    if (!eventId) return undefined;
    let canceled = false;

    async function load() {
      try {
        const qs = new URLSearchParams();
        qs.set("event", eventId);
        if (linkedGame?.espnSummaryPath) qs.set("path", linkedGame.espnSummaryPath);
        const res = await fetch(`/api/live/summary?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (canceled) return;
        setFeedError(!!data.feedError);
        const plays = Array.isArray(data.plays) ? data.plays : [];
        setRemotePlays(plays);
        setTennisBoard(data.tennisBoard ?? null);

        // Update probability history
        setProbHistory((prev) => {
          const p1 = market?.yesPrice ?? 0.5;
          const p2 = market?.noPrice ?? 1 - p1;
          const last = prev[prev.length - 1];
          if (last && Math.abs(last.p1 - p1) < 0.001) return prev;
          return [...prev, { ts: Date.now(), p1, p2 }];
        });

        // Append new plays to point log
        setPointLog((prev) => {
          const newEntries = [];
          for (const play of plays) {
            if (!seenPlayIds.current.has(play.id)) {
              seenPlayIds.current.add(play.id);
              newEntries.push({
                id: play.id,
                ts: play.wallclock ? new Date(play.wallclock).getTime() : Date.now(),
                text: play.text,
                period: play.periodLabel,
                clock: play.clockLabel,
                type: detectPlayType(play.text),
              });
            }
          }
          if (!newEntries.length) return prev;
          return [...newEntries, ...prev];
        });
      } catch {
        if (!canceled) setFeedError(true);
      }
    }

    void load();
    const id = window.setInterval(load, 5_000);
    return () => {
      canceled = true;
      window.clearInterval(id);
    };
  }, [eventId, linkedGame?.espnSummaryPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const mergedTennis = useMemo(
    () => mergeTennisSnapshots(linkedGame?.tennis ?? null, tennisBoard),
    [linkedGame?.tennis, tennisBoard],
  );

  if (!market) {
    return (
      <section className="tp-page">
        <div className="tp-empty-state">Market not found.</div>
      </section>
    );
  }

  const snap = mergedTennis;
  const away = snap?.away;
  const home = snap?.home;
  const isLive = linkedGame?.status === "live";

  // Determine current leader for title ordering
  const awayLeading = (snap?.setsWon?.away ?? 0) >= (snap?.setsWon?.home ?? 0);
  const p1 = awayLeading ? away : home;
  const p2 = awayLeading ? home : away;
  const p1Name = p1?.name ?? linkedGame?.awayTeam ?? "Player 1";
  const p2Name = p2?.name ?? linkedGame?.homeTeam ?? "Player 2";

  const matchTitle = snap?.away
    ? `${p1Name} vs ${p2Name}`
    : market.title;

  const tournamentName = linkedGame?.league ?? linkedGame?.period ?? "";

  const nSets = Math.min(Math.max(
    away?.linescores?.length ?? 0,
    home?.linescores?.length ?? 0,
    snap?.formatPeriods ?? 3,
    1,
  ), 5);

  const parsedPts = parseGamePointsFromStatusText(snap?.statusDetail, snap?.shortDetail);
  const awayPts = away?.pointsDisplay || parsedPts?.away || "—";
  const homePts = home?.pointsDisplay || parsedPts?.home || "—";

  const volFormatted = market.volume != null ? money(market.volume) : null;

  return (
    <section className="tp-page">
      {/* ── Back nav ── */}
      <div className="tp-back-row">
        <Link href="/markets" className="tp-back-btn">← Markets</Link>
      </div>

      {/* ── Match header ── */}
      <header className="tp-match-header">
        <div className="tp-match-header-left">
          <div className="tp-match-title-row">
            <AtpLogo size={22} />
            <h1 className="tp-match-title">{matchTitle}</h1>
          </div>
          <div className="tp-match-status-row">
            {isLive ? (
              <>
                <LiveDot />
                <span className="tp-live-label">LIVE</span>
                <span className="tp-update-hint">Updates every 5s</span>
              </>
            ) : (
              <span className="tp-update-hint">{linkedGame?.clock ?? market.status ?? "Scheduled"}</span>
            )}
          </div>
          {tournamentName ? <div className="tp-tournament-name">{tournamentName}</div> : null}
        </div>
      </header>

      {/* ── Two-column layout ── */}
      <div className="tp-layout">
        {/* ── Left column ── */}
        <div className="tp-col-main">

          {/* Scoreboard */}
          {snap?.away && snap?.home ? (
            <div className="tp-card tp-scoreboard" style={{ "--tp-nsets": nSets }}>
              <div className="tp-scoreboard-header">
                <span className="tp-scoreboard-col-player" />
                {Array.from({ length: nSets }, (_, i) => (
                  <span key={i} className="tp-scoreboard-col-set">S{i + 1}</span>
                ))}
                <span className="tp-scoreboard-col-pts">Pts</span>
              </div>

              {[
                { player: away, pts: awayPts, side: "away" },
                { player: home, pts: homePts, side: "home" },
              ].map(({ player, pts, side }) => {
                const setsWon = snap.setsWon?.[side] ?? 0;
                const oppSetsWon = snap.setsWon?.[side === "away" ? "home" : "away"] ?? 0;
                const isWinning = setsWon > oppSetsWon;
                const isServing = snap.servingSide === side;

                return (
                  <div key={side} className={`tp-scoreboard-row${isWinning ? " tp-scoreboard-row--leading" : ""}`}>
                    <div className="tp-scoreboard-player">
                      <FlagPlaceholder />
                      <span className="tp-scoreboard-name">{player.name}</span>
                      {isServing ? (
                        <span className="tp-serve-indicator" title="Serving"><ServeRacket /></span>
                      ) : null}
                    </div>
                    {Array.from({ length: nSets }, (_, i) => {
                      const cell = player.linescores?.[i];
                      const games = cell?.games;
                      const tb = cell?.tiebreak;
                      const label = games != null ? String(games) : "—";
                      return (
                        <span key={i} className="tp-scoreboard-set-cell">
                          {label}
                          {tb != null && Number.isFinite(tb) ? <sup className="tp-tiebreak">{tb}</sup> : null}
                        </span>
                      );
                    })}
                    <span className="tp-scoreboard-pts-cell">{pts}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Probability chart */}
          <div className="tp-card tp-chart-card">
            <TennisWinProbChart
              history={probHistory}
              p1Name={p1Name}
              p2Name={p2Name}
              volume={volFormatted}
            />
          </div>

          {/* Point-by-point log */}
          <div className="tp-card tp-point-log">
            <h3 className="tp-section-title">Point-by-point</h3>
            <div className="tp-point-log-scroll">
              {pointLog.length === 0 ? (
                <div className="tp-point-log-empty">Points will appear here as the match progresses</div>
              ) : (
                <ul className="tp-point-log-list">
                  {pointLog.map((entry) => (
                    <li
                      key={entry.id}
                      className={`tp-point-log-entry tp-point-log-entry--${entry.type}`}
                    >
                      <span className="tp-point-log-time">
                        {entry.clock || (entry.period ? `${entry.period}` : formatWallclock(entry.ts))}
                      </span>
                      <span className="tp-point-log-text">{entry.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column: sticky betting panel ── */}
        <div className="tp-col-aside">
          <div className="tp-betting-card tp-card">
            <div className="tp-betting-card-header">
              <AtpLogo size={18} />
              <span className="tp-betting-card-title">{matchTitle}</span>
            </div>
            <BettingPanel market={market} linkedGame={linkedGame} variant="premium" />
          </div>
        </div>
      </div>
    </section>
  );
}

function detectPlayType(text = "") {
  const t = text.toLowerCase();
  if (t.includes("wins set") || t.includes("set won")) return "set";
  if (t.includes("wins game") || t.includes("game won") || t.includes("game, ")) return "game";
  return "point";
}

function formatWallclock(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}
