"use client";

import Link from "next/link";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { formatPercent, money } from "../../lib/formatters";
import MarketCard from "../MarketCard";

export default function LandingPage() {
  const { state } = useFriendMarket();
  const featuredMarkets = state.markets.slice(0, 3);
  const totalVolume = state.markets.reduce((sum, market) => sum + Number(market.volume || 0), 0);
  const openBetExposure = state.portfolio.openBets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);

  return (
    <section className="page active">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Live workspace</span>
          <h2>Prediction markets</h2>
          <p>Browse prices, place YES/NO positions, and track friend-boosted exposure without leaving the market flow.</p>
        </div>
        <div className="button-row compact-row">
          <Link className="btn btn-primary" href="/markets">
            Trade Markets
          </Link>
          <Link className="btn btn-secondary" href="/portfolio">
            View Portfolio
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Markets</div>
          <div className="stat-value">{state.markets.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total volume</div>
          <div className="stat-value">{money(totalVolume)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Open exposure</div>
          <div className="stat-value">{money(openBetExposure)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Bonus cap</div>
          <div className="stat-value">{formatPercent(state.adminConfig.maxBonusStakePercent / 100)}</div>
        </div>
      </div>

      <section>
        <div className="section-head">
          <div>
            <h3>Top markets</h3>
            <p>Prices and trade actions stay visible before opening details.</p>
          </div>
          <Link className="btn btn-ghost" href="/markets">All markets</Link>
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
