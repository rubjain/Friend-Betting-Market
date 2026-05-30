"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAgora } from "../../context/AgoraContext";
import { money } from "../../lib/formatters";
import { getLinkedLiveGame, getMarketPipelineSummary } from "../../lib/marketAlgorithms";
import MarketCard from "../MarketCard";

export default function LandingPage() {
  const { state, selectors } = useAgora();

  const landingData = useMemo(() => {
    const catalog = selectors.getMergedMarkets();
    const totalVolume = catalog.reduce((sum, market) => sum + Number(market.volume || 0), 0);
    const pipeline = getMarketPipelineSummary(catalog, state.liveGames);

    // Popular markets: live games first, then upcoming sorted by close time
    const liveMarkets = catalog.filter((m) => {
      const game = getLinkedLiveGame(m, state.liveGames);
      return game?.status === "live";
    });
    const upcomingMarkets = catalog.filter((m) => {
      const game = getLinkedLiveGame(m, state.liveGames);
      return !game || game.status === "scheduled";
    }).sort((a, b) => {
      const at = a.closeTime ? Date.parse(a.closeTime) : Infinity;
      const bt = b.closeTime ? Date.parse(b.closeTime) : Infinity;
      return at - bt;
    });

    // Deduplicate: if same matchup appears multiple times (e.g. 2-game series),
    // keep only the first occurrence (live > soonest scheduled)
    const seen = new Set();
    const deduped = [...liveMarkets, ...upcomingMarkets].filter((m) => {
      const away = m.metadata?.awayTeam ?? m.title;
      const home = m.metadata?.homeTeam ?? m.title;
      const key = `${away}|${home}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const popularMarkets = deduped.slice(0, 10);

    return {
      totalVolume,
      pipeline,
      catalogCount: catalog.length,
      popularMarkets,
    };
  }, [state.liveGames, selectors]);

  return (
    <section className="page active landing-page">
      <div className="hero-section">
        <p className="hero-eyebrow">Paper-money public beta</p>
        <h2 className="hero-headline">Trade what you know. Boost with friends.</h2>
        <p className="hero-sub">
          Binary YES/NO markets on live sports you follow. Social boosts amplify paper winnings; no real money is at stake.
        </p>
        <div className="hero-ctas">
          <Link className="btn btn-primary" href="/markets">Browse Markets</Link>
          <Link className="btn btn-secondary" href="/developer">Developer API</Link>
        </div>
      </div>

      <div className="landing-stats">
        <div className="landing-stat">
          <span className="landing-stat-label">Markets</span>
          <strong className="landing-stat-value">{landingData.catalogCount}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Total volume</span>
          <strong className="landing-stat-value">{money(landingData.totalVolume)}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Sports</span>
          <strong className="landing-stat-value">{landingData.pipeline.categories}</strong>
        </div>
        <div className="landing-stat">
          <span className="landing-stat-label">Live-linked</span>
          <strong className="landing-stat-value">{landingData.pipeline.liveLinked}</strong>
        </div>
      </div>

      <section className="landing-beta-grid" aria-label="Beta paths">
        <Link className="list-card landing-beta-card" href="/markets">
          <span className="label">Sports users</span>
          <strong>Find live-linked markets and place paper trades.</strong>
        </Link>
        <Link className="list-card landing-beta-card" href="/groups">
          <span className="label">Friends beta</span>
          <strong>Create groups, compare leaderboards, and boost together.</strong>
        </Link>
        <Link className="list-card landing-beta-card" href="/developer">
          <span className="label">Model builders</span>
          <strong>Connect external AI bots with scoped API keys.</strong>
        </Link>
      </section>

      <section>
        <div className="section-head">
          <div>
            <h3>Popular Markets</h3>
            <p>Live games first, then today&apos;s upcoming matchups.</p>
          </div>
          <Link className="btn btn-ghost" href="/markets">All Markets</Link>
        </div>
        {landingData.popularMarkets.length ? (
          <div className="market-grid">
            {landingData.popularMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        ) : (
          <article className="card top-market-empty">
            <h4>No markets yet</h4>
            <p>Check back shortly — ESPN markets sync automatically.</p>
          </article>
        )}
      </section>
    </section>
  );
}
