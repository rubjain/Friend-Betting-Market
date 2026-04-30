"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFriendMarket } from "../context/FriendMarketContext";
import { formatPercent, money } from "../lib/formatters";
import { getLinkedLiveGame, getLiveGameClock, getMarketAlgorithmSnapshot } from "../lib/marketAlgorithms";

export default function MarketCard({ market }) {
  const router = useRouter();
  const { state, actions } = useFriendMarket();
  const linkedGame = getLinkedLiveGame(market, state.liveGames);
  const snapshot = getMarketAlgorithmSnapshot(market, state.liveGames);

  function prepare(side) {
    actions.prepareBet(market.id, side);
    router.push(`/markets/${market.id}`);
  }

  return (
    <article className="market-card">
      <div className="market-card-header">
        <span className="market-category-kicker">{market.category}</span>
        {market.status && market.status !== "active" ? (
          <span className="market-status-badge">{market.status}</span>
        ) : null}
      </div>
      <h4 className="market-card-title">{market.title}</h4>
      {linkedGame ? (
        <div className="mini-live-card">
          <span>{linkedGame.league} · {getLiveGameClock(linkedGame)}</span>
          <strong>{linkedGame.awayTeam} {linkedGame.awayScore} · {linkedGame.homeTeam} {linkedGame.homeScore}</strong>
        </div>
      ) : null}
      <div className="market-price-grid" aria-label={`${market.title} prices`}>
        <button className="price-button yes-price" type="button" onClick={() => prepare("YES")}>
          <span>Yes</span>
          <strong>{formatPercent(market.yesPrice)}</strong>
        </button>
        <button className="price-button no-price" type="button" onClick={() => prepare("NO")}>
          <span>No</span>
          <strong>{formatPercent(market.noPrice)}</strong>
        </button>
      </div>
      <div className="market-card-footer">
        <span className="market-meta-item">Vol {money(market.volume)}</span>
        <span className="market-meta-item">Closes {market.endDate}</span>
        <span className="market-meta-item">{market.friendsBoosting} boosts</span>
        <div className="market-card-actions">
          <Link className="btn btn-secondary btn-sm" href={`/markets/${market.id}`}>
            Details
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/friends" onClick={() => actions.setSelectedMarket(market.id)}>
            Boost
          </Link>
        </div>
      </div>
    </article>
  );
}
