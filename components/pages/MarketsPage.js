"use client";

import { useFriendMarket } from "../../context/FriendMarketContext";
import { marketCategories } from "../../lib/marketTaxonomy";
import { getMarketPipelineSummary } from "../../lib/marketAlgorithms";
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

  return (
    <section className="page active">
      <div className="markets-overview">
        <SectionHead
          title="Markets"
          body="Browse sports, crypto, finance, weather, and politics-style markets with clear settlement rules and optional social boosts."
        />
        <div className="market-discovery-panel">
          <div className="category-scroll" aria-label="Market categories">
            <button
              className={`category-chip${state.filters.category === "all" ? " active" : ""}`}
              type="button"
              onClick={() => actions.setFilters({ category: "all" })}
            >
              All
            </button>
            {marketCategories.map((category) => (
              <button
                className={`category-chip${state.filters.category === category.label ? " active" : ""}`}
                type="button"
                key={category.id}
                onClick={() => actions.setFilters({ category: category.label })}
              >
                {category.label}
              </button>
            ))}
          </div>
          <label className="market-search-control" htmlFor="market-search">
            <span aria-hidden="true">Search</span>
            <input
              id="market-search"
              type="search"
              placeholder="Find markets"
              value={state.filters.query}
              onChange={(event) => actions.setFilters({ query: event.currentTarget.value })}
            />
          </label>
        </div>
      </div>
      <div className="market-command-row">
        <div>
          <span className="label">Expansion map</span>
          <strong>
            {pipeline.categories} categories · {state.markets.length} seeded markets
          </strong>
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
      <div className="market-count-strip">
        <strong>{filteredMarkets.length}</strong>
        <span>{filteredMarkets.length === 1 ? "market" : "markets"} visible</span>
      </div>
      <div className="market-grid market-grid--compact">
        {filteredMarkets.length ? (
          filteredMarkets.map((market) => <MarketCard market={market} key={market.id} compact />)
        ) : (
          <EmptyState title="No matching markets" body="Try a different search or filter to find a market." />
        )}
      </div>
    </section>
  );
}
