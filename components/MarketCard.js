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
      <div className="market-top">
        <div>
          <div className="market-kicker">
            <span>{market.category}</span>
            <span>{market.status ?? "active"}</span>
            <span>{snapshot.signal}</span>
          </div>
          <h4>{market.title}</h4>
        </div>
      </div>
      <p className="market-description">{market.description}</p>
      {linkedGame ? (
        <div className="mini-live-card">
          <span>{linkedGame.league} · {getLiveGameClock(linkedGame)}</span>
          <strong>{linkedGame.awayTeam} {linkedGame.awayScore} · {linkedGame.homeTeam} {linkedGame.homeScore}</strong>
        </div>
      ) : null}
      <div className="market-price-grid" aria-label={`${market.title} prices`}>
        <button className="price-button yes-price" type="button" onClick={() => prepare("YES")}>
          <span>YES</span>
          <strong>{formatPercent(market.yesPrice)}</strong>
        </button>
        <button className="price-button no-price" type="button" onClick={() => prepare("NO")}>
          <span>NO</span>
          <strong>{formatPercent(market.noPrice)}</strong>
        </button>
      </div>
      <div className="market-meta-row">
        <span>Vol {money(market.volume)}</span>
        <span>Closes {market.endDate}</span>
        <span>{market.friendsBoosting} boosts</span>
        <span>{snapshot.liquidityScore} liquidity</span>
      </div>
      <div className="market-actions">
        <Link className="btn btn-secondary" href={`/markets/${market.id}`}>
          Details
        </Link>
        <Link className="btn btn-ghost" href="/friends" onClick={() => actions.setSelectedMarket(market.id)}>
          Boost
        </Link>
      </div>
    </article>
  );
}
