"use client";

import { useEffect, useRef, useMemo } from "react";
import { useAgora } from "../../context/AgoraContext";
import { sportMarketCategories } from "../../lib/marketTaxonomy";
import { getMarketPipelineSummary } from "../../lib/marketAlgorithms";
import LiveGamesRail from "../LiveGamesRail";
import MarketCard from "../MarketCard";
import { EmptyState, SectionHead } from "../ui";

const SORT_OPTIONS = [
  { key: "newest",  label: "Newest" },
  { key: "volume",  label: "Volume" },
  { key: "closing", label: "Closing soon" },
  { key: "longshot",label: "Long shots" },
];

function isLiveMarket(market, liveGames) {
  return liveGames?.some((g) => g.id === market.id && g.status === "live") ?? false;
}

function sortMarkets(markets, sort, liveGames) {
  const live = markets.filter((m) => isLiveMarket(m, liveGames));
  const rest = markets.filter((m) => !isLiveMarket(m, liveGames));

  function innerSort(arr) {
    const copy = [...arr];
    switch (sort) {
      case "volume":
        return copy.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
      case "closing":
        return copy.sort((a, b) => {
          if (!a.endDate) return 1;
          if (!b.endDate) return -1;
          return a.endDate < b.endDate ? -1 : a.endDate > b.endDate ? 1 : 0;
        });
      case "longshot":
        return copy.sort(
          (a, b) =>
            Math.min(a.yesPrice ?? 0.5, a.noPrice ?? 0.5) -
            Math.min(b.yesPrice ?? 0.5, b.noPrice ?? 0.5),
        );
      case "newest":
      default:
        // Sort upcoming by start time (soonest first)
        return copy.sort((a, b) => {
          const at = a.closeTime ? Date.parse(a.closeTime) : Infinity;
          const bt = b.closeTime ? Date.parse(b.closeTime) : Infinity;
          return at - bt;
        });
    }
  }

  // Live games always first, then sorted rest
  return [...innerSort(live), ...innerSort(rest)];
}

export default function MarketsPage() {
  const { state, actions, selectors } = useAgora();
  const searchRef = useRef(null);
  const catalogMarkets = selectors.getMergedMarkets();

  const query    = state.filters.query ?? "";
  const category = state.filters.category ?? "all";
  const sort     = state.filters.sort ?? "newest";

  const hasActiveFilter = query !== "" || category !== "all";

  const filteredMarkets = useMemo(() => {
    const lower = query.toLowerCase();
    const filtered = catalogMarkets.filter((market) => {
      const matchesQuery =
        !lower ||
        market.title.toLowerCase().includes(lower) ||
        market.description?.toLowerCase().includes(lower) ||
        market.category?.toLowerCase().includes(lower);
      const matchesCategory = category === "all" || market.category === category;
      return matchesQuery && matchesCategory;
    });
    return sortMarkets(filtered, sort, state.liveGames);
  }, [catalogMarkets, query, category, sort, state.liveGames]);

  const pipeline = getMarketPipelineSummary(catalogMarkets, state.liveGames);

  // ⌘K / Ctrl+K focuses the search input
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function clearFilters() {
    actions.setFilters({ query: "", category: "all" });
  }

  return (
    <section className="page active markets-page">
      <div className="markets-overview">
        <SectionHead
          title="Markets"
          body="Sports prediction markets — browse by league, search by keyword, or sort by what matters to you."
        />

        {/* Search + clear */}
        <div className="markets-search-row">
          <div className="market-search-wrap">
            <span className="market-search-icon" aria-hidden="true">🔍</span>
            <input
              ref={searchRef}
              id="market-search"
              type="search"
              className="market-search-input"
              placeholder="Search markets… (⌘K)"
              value={query}
              onChange={(e) => actions.setFilters({ query: e.currentTarget.value })}
              aria-label="Search markets"
            />
            {query && (
              <button
                className="market-search-clear"
                type="button"
                aria-label="Clear search"
                onClick={() => actions.setFilters({ query: "" })}
              >
                ×
              </button>
            )}
          </div>
          {hasActiveFilter && (
            <button className="btn btn-ghost btn-sm markets-clear-btn" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="category-scroll" aria-label="Market categories" role="group">
          <button
            className={`category-chip${category === "all" ? " active" : ""}`}
            type="button"
            onClick={() => actions.setFilters({ category: "all" })}
          >
            All
          </button>
          {sportMarketCategories.map((cat) => (
            <button
              className={`category-chip${category === cat.label ? " active" : ""}`}
              type="button"
              key={cat.id}
              onClick={() => actions.setFilters({ category: cat.label })}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div className="markets-sort-row" role="group" aria-label="Sort markets">
          <span className="markets-sort-label">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`markets-sort-btn${sort === opt.key ? " active" : ""}`}
              type="button"
              onClick={() => actions.setFilters({ sort: opt.key })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <LiveGamesRail
        games={state.liveGames}
        markets={catalogMarkets}
        categoryFilter={category}
      />

      <div className="market-command-row">
        <div>
          <span className="label">Total</span>
          <strong>{pipeline.categories} categories · {catalogMarkets.length} markets</strong>
        </div>
        <div>
          <span className="label">Algorithmic</span>
          <strong>{pipeline.algorithmic} model-backed</strong>
        </div>
        <div>
          <span className="label">Live</span>
          <strong>{pipeline.liveLinked} game-linked</strong>
        </div>
      </div>

      <div className="market-count-strip">
        <strong>{filteredMarkets.length}</strong>
        <span>{filteredMarkets.length === 1 ? "market" : "markets"}{hasActiveFilter ? " matching" : ""}</span>
        {hasActiveFilter && filteredMarkets.length < catalogMarkets.length && (
          <button className="market-count-clear" type="button" onClick={clearFilters}>
            Show all {catalogMarkets.length}
          </button>
        )}
      </div>

      <div className="market-grid market-grid--compact">
        {filteredMarkets.length ? (
          filteredMarkets.map((market) => (
            <MarketCard market={market} key={market.id} compact />
          ))
        ) : (
          <EmptyState
            title="No matching markets"
            body={
              hasActiveFilter
                ? "Try a different search term or remove the category filter."
                : "No markets available right now."
            }
            action={hasActiveFilter ? { label: "Clear filters", onClick: clearFilters } : undefined}
          />
        )}
      </div>
    </section>
  );
}
