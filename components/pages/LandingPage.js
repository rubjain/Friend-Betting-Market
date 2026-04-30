"use client";

import Link from "next/link";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { formatPercent, money } from "../../lib/formatters";
import { getMarketPipelineSummary, rankMarketsBySignal } from "../../lib/marketAlgorithms";
import MarketCard from "../MarketCard";

export default function LandingPage() {
  const { state } = useFriendMarket();
  const featuredMarkets = state.markets.slice(0, 6);
  const totalVolume = state.markets.reduce((sum, market) => sum + Number(market.volume || 0), 0);
  const openBetExposure = state.portfolio.openBets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
  const pipeline = getMarketPipelineSummary(state.markets, state.liveGames);
  const signalLeaders = rankMarketsBySignal(state.markets, state.liveGames).slice(0, 1);

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
          <span className="landing-stat-value">{state.markets.length}</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Total volume</span>
          <span className="landing-stat-value">{money(totalVolume)}</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Your exposure</span>
          <span className="landing-stat-value">{money(openBetExposure)}</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Bonus cap</span>
          <span className="landing-stat-value">{formatPercent(state.adminConfig.maxBonusStakePercent / 100)}</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Top signal</span>
          <span className="landing-stat-value">{signalLeaders[0]?.snapshot.signal ?? "—"}</span>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Source-ready</span>
          <span className="landing-stat-value">{state.markets.length - pipeline.needsSource}/{state.markets.length}</span>
        </div>
      </div>

      <section>
        <div className="section-head">
          <div>
            <h3>Top Markets</h3>
            <p>Live YES/NO prices — click to open a position.</p>
          </div>
          <Link className="btn btn-ghost" href="/markets">All Markets →</Link>
        </div>
        <div className="market-grid">
          {featuredMarkets.map((market) => (
            <MarketCard market={market} key={market.id} />
          ))}
        </div>
      </section>
    </section>
  );
}
