"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { money } from "../../lib/formatters";
import { getMarketPipelineSummary } from "../../lib/marketAlgorithms";
import MarketCard from "../MarketCard";

export default function LandingPage() {
  const { state } = useFriendMarket();
  const landingData = useMemo(() => {
    const featuredMarkets = [...state.markets]
      .sort((left, right) => Number(right.volume || 0) - Number(left.volume || 0))
      .slice(0, 12);
    const totalVolume = state.markets.reduce((sum, market) => sum + Number(market.volume || 0), 0);
    const pipeline = getMarketPipelineSummary(state.markets, state.liveGames);

    return {
      featuredMarkets,
      totalVolume,
      pipeline,
    };
  }, [state.liveGames, state.markets]);

  return (
    <section className="page active">
      <div className="hero-section">
        <p className="hero-eyebrow">Social prediction markets</p>
        <h2 className="hero-headline">Trade what you know. Boost with friends.</h2>
        <p className="hero-sub">
          Binary YES/NO markets on sports, crypto, politics, and more. Social boosts amplify your winnings.
        </p>
        <div className="hero-ctas">
          <Link className="btn btn-primary" href="/markets">Browse Markets</Link>
          <Link className="btn btn-secondary" href="/portfolio">My Portfolio</Link>
        </div>
      </div>

      <div className="landing-stats">
        <div className="landing-stat">
          <span className="landing-stat-label">Markets</span>
          <strong className="landing-stat-value">{state.markets.length}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Total volume</span>
          <strong className="landing-stat-value">{money(landingData.totalVolume)}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Categories</span>
          <strong className="landing-stat-value">{landingData.pipeline.categories}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Live-linked</span>
          <strong className="landing-stat-value">{landingData.pipeline.liveLinked}</strong>
        </div>
      </div>

      <section>
        <div className="section-head">
          <div>
            <h3>Top Markets</h3>
            <p>Concise YES/NO markets ranked by volume.</p>
          </div>
          <Link className="btn btn-ghost" href="/markets">All Markets</Link>
        </div>
        <div className="market-grid market-grid--compact">
          {landingData.featuredMarkets.map((market) => (
            <MarketCard market={market} key={market.id} compact />
          ))}
        </div>
      </section>
    </section>
  );
}
