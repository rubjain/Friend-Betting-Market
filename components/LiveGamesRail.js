"use client";

import Link from "next/link";
import { useMemo } from "react";
import { filterGamesForScoreRail, getLiveGameNavPath, getMarketForLiveGame } from "../lib/gameMarkets";
import { getLiveGameClock } from "../lib/marketAlgorithms";

function trimLeague(label) {
  if (!label || label.length <= 22) {
    return label;
  }
  return `${label.slice(0, 20)}…`;
}

export default function LiveGamesRail({ games, markets = [], categoryFilter = "all" }) {
  const rows = useMemo(() => filterGamesForScoreRail(games, categoryFilter), [games, categoryFilter]);

  const filterLabel =
    categoryFilter && categoryFilter !== "all" ? ` · ${categoryFilter}` : "";

  if (!rows.length) {
    return (
      <div className="live-games-rail live-games-rail--empty">
        <p className="caption">
          {categoryFilter && categoryFilter !== "all"
            ? `No live or upcoming games for ${categoryFilter} in the current feed. Try another sport or All.`
            : "Live scores load when the ESPN feed returns games."}
        </p>
      </div>
    );
  }

  return (
    <div className="live-games-rail">
      <div className="live-games-rail-head">
        <span className="live-games-rail-title">Live scores{filterLabel}</span>
        <span className="live-games-rail-meta">{rows.length} games</span>
      </div>
      <div className="live-games-rail-scroll" aria-label="Live game scores">
        {rows.map((g) => {
          const href = getLiveGameNavPath(g, markets);
          const hasMarket = Boolean(getMarketForLiveGame(g, markets));
          const ariaDetail = hasMarket ? "Open prediction market." : "View game details.";
          return (
          <Link
            key={g.id}
            href={href}
            className={`live-games-card live-games-card--link live-games-card--${g.status}`}
            aria-label={`${g.awayTeam ?? ""} at ${g.homeTeam ?? ""}, ${getLiveGameClock(g)}. ${ariaDetail}`}
          >
            <div className="live-games-card-league" title={g.league}>
              {trimLeague(g.league)}
            </div>
            <div className="live-games-card-match">
              <span className="live-games-card-team">{g.awayAbbr ?? g.awayTeam}</span>
              <span className="live-games-card-score">
                {g.awayScore ?? "—"}–{g.homeScore ?? "—"}
              </span>
              <span className="live-games-card-team">{g.homeAbbr ?? g.homeTeam}</span>
            </div>
            <div className="live-games-card-status">{getLiveGameClock(g)}</div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
