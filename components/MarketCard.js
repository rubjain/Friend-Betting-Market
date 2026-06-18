"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useAgora } from "../context/AgoraContext";
import { formatMarketDate, formatPercent, money } from "../lib/formatters";
import { getLinkedLiveGame, getLiveGameClock } from "../lib/marketAlgorithms";
import { getContractSideLabels } from "../lib/marketLabels";

export default function MarketCard({ market, compact = false }) {
  const router = useRouter();
  const { state, actions } = useAgora();
  const linkedGame = getLinkedLiveGame(market, state.liveGames);
  const { yesLabel, noLabel } = useMemo(
    () => getContractSideLabels(market, linkedGame, { shortSides: true }),
    [market, linkedGame],
  );
  const fullSides = useMemo(() => getContractSideLabels(market, linkedGame), [market, linkedGame]);

  function prepare(side) {
    actions.prepareBet(market.id, side);
    router.push(`/markets/${market.id}`);
  }

  return (
    <article className={`market-card${compact ? " market-card--compact" : ""}`}>
      <Link
        href={`/markets/${market.id}`}
        className="market-card-stretched-link"
        aria-label={`View market: ${market.title}`}
        prefetch
      />
      <div className="market-card-copy">
        <div className="market-card-header">
          <span className="market-category-kicker" title={market.category}>
            {market.category}
          </span>
          <span className="market-card-header-badges">
            {linkedGame?.status === "live" ? <span className="market-live-badge">LIVE</span> : null}
            {market.status && market.status !== "active" ? (
              <span className="market-status-badge">{market.status}</span>
            ) : null}
          </span>
        </div>
        <h4 className="market-card-title" title={market.title}>
          {market.title}
        </h4>
        <div className={`market-card-live-slot${compact ? " market-card-live-slot--compact" : ""}`}>
          {linkedGame ? (
            <div className={`mini-live-card${compact ? " mini-live-card--compact" : ""}`}>
              <span
                className="mini-live-card-meta"
                title={`${linkedGame.league} — ${getLiveGameClock(linkedGame)}`}
              >
                {linkedGame.status === "live" ? "LIVE · " : ""}
                {linkedGame.league} — {getLiveGameClock(linkedGame)}
              </span>
              <strong
                className="mini-live-card-scoreline"
                title={`${linkedGame.awayTeam} ${linkedGame.awayScore} · ${linkedGame.homeTeam} ${linkedGame.homeScore}`}
              >
                {linkedGame.awayTeam} {linkedGame.awayScore} · {linkedGame.homeTeam} {linkedGame.homeScore}
              </strong>
            </div>
          ) : null}
        </div>
      </div>
      <div className="market-price-grid market-card-interactive" aria-label={`${market.title} prices`}>
        <button
          className="price-button yes-price"
          type="button"
          title={fullSides.yesLabel}
          aria-label={`Bet YES — ${fullSides.yesLabel} at ${formatPercent(market.yesPrice)}`}
          onClick={() => prepare("YES")}
        >
          <span className="price-button-label">{yesLabel}</span>
          <strong className="price-button-value">{formatPercent(market.yesPrice)}</strong>
        </button>
        <button
          className="price-button no-price"
          type="button"
          title={fullSides.noLabel}
          aria-label={`Bet NO — ${fullSides.noLabel} at ${formatPercent(market.noPrice)}`}
          onClick={() => prepare("NO")}
        >
          <span className="price-button-label">{noLabel}</span>
          <strong className="price-button-value">{formatPercent(market.noPrice)}</strong>
        </button>
      </div>
      <div className="market-card-footer">
        <div className="market-meta-group">
          <span className="market-meta-item">Vol {money(market.volume)}</span>
          <span className="market-meta-item">Closes {formatMarketDate(market.endDate)}</span>
          {compact ? null : <span className="market-meta-item">{market.friendsBoosting} boosts</span>}
        </div>
        {!compact ? (
          <div className="market-card-actions market-card-interactive">
            <Link className="btn btn-ghost btn-sm" href="/friends" onClick={() => actions.setSelectedMarket(market.id)}>
              Boost
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}
