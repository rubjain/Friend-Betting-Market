"use client";

import { useEffect, useMemo, useState } from "react";
import { useFriendMarket } from "../context/FriendMarketContext";
import { signedMoney, titleCase } from "../lib/formatters";
import { getLedgerView, ledgerFilterOptions, ledgerSortOptions } from "../lib/ledgerViews";

export default function PortfolioLedger() {
  const { state, actions, selectors } = useFriendMarket();
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const ledgerEntries = selectors.getLedgerEntries();
  const view = useMemo(
    () => getLedgerView({ entries: ledgerEntries, filter: state.ledgerFilter, sort, page, pageSize: 6 }),
    [ledgerEntries, page, sort, state.ledgerFilter],
  );
  const visibleFilterOptions = useMemo(
    () => ledgerFilterOptions.filter(([value]) => value !== "admin_adjustment"),
    [],
  );

  useEffect(() => {
    if (!visibleFilterOptions.some(([value]) => value === state.ledgerFilter)) {
      actions.setLedgerFilter("all");
      setPage(1);
    }
  }, [actions, state.ledgerFilter, visibleFilterOptions]);

  function updateFilter(value) {
    actions.setLedgerFilter(value);
    setPage(1);
  }

  function updateSort(value) {
    setSort(value);
    setPage(1);
  }
  return (
    <div className="list-card">
      <div className="row-between">
        <div>
          <h3>Transaction history</h3>
          <p>Audit trail for deposits, withdrawals, bets, payouts, and boosts.</p>
        </div>
      </div>
      <div className="segmented-control" aria-label="Ledger filter">
        {visibleFilterOptions.slice(0, 5).map(([value, label]) => (
          <button
            key={value}
            className={state.ledgerFilter === value ? "active" : ""}
            type="button"
            onClick={() => updateFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="table-toolbar">
        <label className="field compact-field" htmlFor="portfolio-ledger-sort">
          <span className="label">Sort</span>
          <select className="ui-select" id="portfolio-ledger-sort" value={sort} onChange={(event) => updateSort(event.currentTarget.value)}>
            {ledgerSortOptions.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="pagination-copy">
          {view.totalEntries} entries · page {view.currentPage} of {view.totalPages}
        </div>
      </div>
      <div className="ledger-list">
        {view.entries.length ? (
          view.entries.map((entry) => (
            <div className="ledger-row" key={`${entry.timestamp}-${entry.source}-${entry.amount}`}>
              <div>
                <strong>{titleCase(entry.source)}</strong>
                <div className="caption">
                  {entry.currency_type} &middot; {entry.timestamp.slice(0, 10)}
                </div>
                <div className="caption">{entry.metadata}</div>
              </div>
              <strong className={`ledger-amount ${entry.transaction_type}`}>{signedMoney(entry)}</strong>
            </div>
          ))
        ) : (
          <div className="empty-note">No transactions match this filter.</div>
        )}
      </div>
      <div className="pagination-controls">
        <button className="btn btn-ghost" type="button" disabled={view.currentPage === 1} onClick={() => setPage((value) => value - 1)}>
          Previous
        </button>
        <button className="btn btn-secondary" type="button" disabled={view.currentPage === view.totalPages} onClick={() => setPage((value) => value + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
