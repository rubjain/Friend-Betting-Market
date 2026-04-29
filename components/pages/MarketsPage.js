"use client";

import { useFriendMarket } from "../../context/FriendMarketContext";
import { marketCategories } from "../../lib/marketTaxonomy";
import MarketCard from "../MarketCard";
import { EmptyState, SectionHead } from "../ui";

export default function MarketsPage() {
  const { state, actions } = useFriendMarket();
  const filteredMarkets = state.markets.filter((market) => {
    const matchesQuery = market.title.toLowerCase().includes(state.filters.query.toLowerCase());
    const matchesCategory = state.filters.category === "all" || market.category === state.filters.category;
    return matchesQuery && matchesCategory;
  });

  return (
    <section className="page active">
      <SectionHead
        title="Markets"
        body="Simple, searchable market cards with clear outcomes and lightweight decisions."
      />
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
      <div className="coverage-strip" aria-label="Market coverage roadmap">
        {marketCategories.map((category) => (
          <article className="coverage-pill" key={category.id}>
            <strong>{category.label}</strong>
            <span>{category.examples.slice(0, 3).join(", ")}</span>
          </article>
        ))}
      </div>
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
