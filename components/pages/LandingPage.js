"use client";

import Link from "next/link";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { formatPercent, money } from "../../lib/formatters";
import { getLiveGameClock, getMarketPipelineSummary, rankMarketsBySignal } from "../../lib/marketAlgorithms";
import MarketCard from "../MarketCard";

export default function LandingPage() {
  const { state } = useFriendMarket();
  const featuredMarkets = state.markets.slice(0, 3);
  const totalVolume = state.markets.reduce((sum, market) => sum + Number(market.volume || 0), 0);
  const openBetExposure = state.portfolio.openBets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
  const pipeline = getMarketPipelineSummary(state.markets, state.liveGames);
  const signalLeaders = rankMarketsBySignal(state.markets, state.liveGames).slice(0, 3);

  return (
    <section className="page active">
      <div className="hero-console">
        <div className="hero-copy">
          <span className="eyebrow">Friend-powered trading desk</span>
          <h2>Markets, live games, and model signals in one place.</h2>
          <p>
            Browse YES/NO prices, track sports feeds, and see which algorithms are moving before opening a position.
          </p>
          <div className="button-row">
            <Link className="btn btn-primary" href="/markets">
              Trade Markets
            </Link>
            <Link className="btn btn-secondary" href="/portfolio">
              View Portfolio
            </Link>
          </div>
        </div>
        <div className="live-board" aria-label="Live game tracking">
          <div className="live-board-head">
            <span className="live-dot" />
            <strong>Live game tracking</strong>
          </div>
          {state.liveGames.slice(0, 3).map((game) => (
            <div className="game-row" key={game.id}>
              <div>
                <span className="label">{game.league} · {getLiveGameClock(game)}</span>
                <strong>{game.awayTeam} @ {game.homeTeam}</strong>
              </div>
              <div className="score-stack">
                <strong>{game.awayScore}-{game.homeScore}</strong>
                <span>{game.feedStatus}</span>
              </div>
            </div>
          ))}
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

      <section className="ops-strip">
        <div>
          <span className="label">Market coverage</span>
          <strong>{pipeline.categories} categories</strong>
          <p>{pipeline.algorithmic} algorithm-backed markets and {pipeline.liveLinked} linked live games are seeded.</p>
        </div>
        <div>
          <span className="label">Source readiness</span>
          <strong>{state.markets.length - pipeline.needsSource}/{state.markets.length}</strong>
          <p>Markets with complete public evidence links will graduate from planned to launch-ready.</p>
        </div>
        <div>
          <span className="label">Signal leaders</span>
          <strong>{signalLeaders[0]?.snapshot.signal ?? "Calm"}</strong>
          <p>{signalLeaders[0]?.market.title ?? "No market signals yet"}</p>
        </div>
      </section>

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
