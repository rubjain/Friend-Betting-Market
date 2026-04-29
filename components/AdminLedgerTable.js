"use client";

import { useEffect, useMemo, useState } from "react";
import { signedMoney, titleCase } from "../lib/formatters";
import { getLedgerView, ledgerFilterOptions, ledgerSortOptions } from "../lib/ledgerViews";

export default function AdminLedgerTable({ ledger }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const fallbackView = useMemo(
    () => getLedgerView({ entries: ledger, filter, sort, page, pageSize: 8 }),
    [filter, ledger, page, sort],
  );
  const [serverView, setServerView] = useState(null);
  const view = serverView ?? fallbackView;

  useEffect(() => {
    let canceled = false;

    async function loadLedgerPage() {
      try {
        const params = new URLSearchParams({
          filter,
          sort,
          page: String(page),
          pageSize: "8",
        });
        const response = await fetch(`/api/admin/ledger?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Ledger API request failed.");
        }
        const payload = await response.json();
        if (!canceled) {
          setServerView(payload);
        }
      } catch {
        if (!canceled) {
          setServerView(null);
        }
      }
    }

    loadLedgerPage();

    return () => {
      canceled = true;
    };
  }, [filter, page, sort]);

  function updateFilter(value) {
    setFilter(value);
    setPage(1);
  }

  function updateSort(value) {
    setSort(value);
    setPage(1);
  }

  return (
    <div className="table-card admin-wide">
      <h3>Admin audit history</h3>
      <p>Ledger movements across demo users, markets, bets, and admin controls.</p>
      <div className="table-toolbar">
        <label className="field compact-field" htmlFor="admin-ledger-filter">
          <span className="label">Filter</span>
          <select id="admin-ledger-filter" value={filter} onChange={(event) => updateFilter(event.currentTarget.value)}>
            {ledgerFilterOptions.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field compact-field" htmlFor="admin-ledger-sort">
          <span className="label">Sort</span>
          <select id="admin-ledger-sort" value={sort} onChange={(event) => updateSort(event.currentTarget.value)}>
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
      <table className="data-table dense-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            <th>Source</th>
            <th>Currency</th>
            <th>Amount</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {view.entries.length ? (
            view.entries.map((entry) => (
              <tr key={`${entry.timestamp}-${entry.user_id}-${entry.source}-${entry.amount}`}>
                <td data-label="Time">{entry.timestamp.slice(0, 10)}</td>
                <td data-label="User">{entry.user_id}</td>
                <td data-label="Source">{titleCase(entry.source)}</td>
                <td data-label="Currency">{entry.currency_type}</td>
                <td data-label="Amount">
                  <strong className={`ledger-amount ${entry.transaction_type}`}>
                    {signedMoney(entry)}
                  </strong>
                </td>
                <td data-label="Metadata">{entry.metadata}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td data-label="Audit history" colSpan="6">
                <div className="empty-note">No ledger entries yet.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
