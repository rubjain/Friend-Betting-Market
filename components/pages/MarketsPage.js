"use client";

import { useFriendMarket } from "../../context/FriendMarketContext";
import { money } from "../../lib/formatters";
import { marketCategories } from "../../lib/marketTaxonomy";
import { getMarketPipelineSummary, rankMarketsBySignal } from "../../lib/marketAlgorithms";
import MarketCard from "../MarketCard";
import { EmptyState, SectionHead } from "../ui";

export default function MarketsPage() {
  const { state, actions } = useFriendMarket();
  const filteredMarkets = state.markets.filter((market) => {
    const matchesQuery = market.title.toLowerCase().includes(state.filters.query.toLowerCase());
    const matchesCategory = state.filters.category === "all" || market.category === state.filters.category;
    return matchesQuery && matchesCategory;
  });
  const pipeline = getMarketPipelineSummary(state.markets, state.liveGames);
  const topSignals = rankMarketsBySignal(filteredMarkets, state.liveGames).slice(0, 3);
  const openExposure = state.portfolio.openBets.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);

  return (
    <section className="page active">
      <div className="markets-overview">
        <SectionHead
          title="Markets"
          body="Trade live sports, macro, crypto, tech, culture, and politics markets with clear settlement rules."
        />
        <div className="market-account-panel">
          <div>
            <span className="label">Balance</span>
            <strong>{money(state.currentUser.play_credit_balance)}</strong>
          </div>
          <div>
            <span className="label">Open positions</span>
            <strong>{state.portfolio.openBets.length}</strong>
          </div>
          <div>
            <span className="label">Exposure</span>
            <strong>{money(openExposure)}</strong>
          </div>
          <a className="btn btn-primary" href="/settings">Deposit</a>
          <a className="btn btn-secondary" href="/portfolio">Positions</a>
        </div>
      </div>
      <div className="market-command-row">
        <div>
          <span className="label">Expansion map</span>
          <strong>{pipeline.categories} categories · {state.markets.length} seeded markets</strong>
        </div>
        <div>
          <span className="label">Algorithms</span>
          <strong>{pipeline.algorithmic} model-backed</strong>
        </div>
        <div>
          <span className="label">Live feeds</span>
          <strong>{pipeline.liveLinked} game-linked</strong>
        </div>
      </div>
      <div className="toolbar">
        <div className="field">
          <label className="visually-hidden" htmlFor="market-search">
            Search markets
          </label>
          <input
            id="market-search"
            type="search"
            placeholder="Search markets"
            value={state.filters.query}
            onChange={(event) => actions.setFilters({ query: event.currentTarget.value })}
          />
        </div>
        <div className="field">
          <label className="visually-hidden" htmlFor="market-category">
            Category
          </label>
          <select
            id="market-category"
            value={state.filters.category}
            onChange={(event) => actions.setFilters({ category: event.currentTarget.value })}
          >
            <option value="all">All categories</option>
            {marketCategories.map((category) => (
              <option value={category.label} key={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="market-count-strip">
        <strong>{filteredMarkets.length}</strong>
        <span>{filteredMarkets.length === 1 ? "market" : "markets"} visible</span>
      </div>
      {topSignals.length ? (
        <div className="signal-rail">
          {topSignals.map(({ market, snapshot }) => (
            <LinkPreviewSignal key={market.id} market={market} snapshot={snapshot} />
          ))}
        </div>
      ) : null}
      <div className="market-grid">
        {filteredMarkets.length ? (
          filteredMarkets.map((market) => <MarketCard market={market} key={market.id} />)
        ) : (
          <EmptyState title="No matching markets" body="Try a different search or filter to find a market." />
        )}
      </div>
    </section>
  );
}

function LinkPreviewSignal({ market, snapshot }) {
  return (
    <a className="signal-pill" href={`/markets/${market.id}`}>
      <span>{snapshot.signal}</span>
      <strong>{market.title}</strong>
      <em>{snapshot.movementScore} movement</em>
    </a>
  );
}
