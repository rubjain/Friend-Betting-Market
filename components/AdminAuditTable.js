"use client";

import { useEffect, useState } from "react";
import { titleCase } from "../lib/formatters";

const auditActionOptions = [
  ["all", "All actions"],
  ["admin.config.updated", "Config updates"],
  ["bet.placed", "Bet placement"],
  ["bonus.removed", "Bonus removals"],
  ["dispute.opened", "Dispute opened"],
  ["dispute.updated", "Dispute updates"],
  ["friend.boost.added", "Boost added"],
  ["friend.boost.removed", "Boost removed"],
  ["friend.invited", "Friend invites"],
  ["friend.request.updated", "Friend requests"],
  ["funds.credit", "Funds credits"],
  ["market.approved", "Market approvals"],
  ["market.lifecycle.updated", "Market lifecycle"],
  ["market.rejected", "Market rejections"],
  ["market.resolved", "Market resolutions"],
  ["market.submitted", "Market submissions"],
  ["profile.updated", "Profile updates"],
  ["risk.cleared", "Risk clears"],
  ["user.frozen", "User freezes"],
  ["user.unfrozen", "User unfreezes"],
  ["verification.updated", "Verification updates"],
];

function readableAction(action) {
  return titleCase(String(action || "").replace(/\./g, "_"));
}

function metadataSummary(metadata) {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => {
      const label = titleCase(key);
      const display = typeof value === "object" ? JSON.stringify(value) : String(value);
      return `${label}: ${display}`;
    })
    .join("; ");
}

export default function AdminAuditTable() {
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState({ entries: [], currentPage: 1, totalPages: 1, totalEntries: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let canceled = false;

    async function loadAuditPage() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action,
          page: String(page),
          pageSize: "10",
        });
        const response = await fetch(`/api/admin/audit?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Audit API request failed.");
        }
        const payload = await response.json();
        if (!canceled) {
          setView(payload);
        }
      } catch {
        if (!canceled) {
          setView({ entries: [], currentPage: 1, totalPages: 1, totalEntries: 0 });
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    loadAuditPage();

    return () => {
      canceled = true;
    };
  }, [action, page]);

  function updateAction(nextAction) {
    setAction(nextAction);
    setPage(1);
  }

  return (
    <div className="table-card admin-wide">
      <h3>Operational audit log</h3>
      <p>Admin and user actions captured by the persisted audit trail.</p>
      <div className="table-toolbar">
        <label className="field compact-field" htmlFor="admin-audit-action">
          <span className="label">Action</span>
          <select id="admin-audit-action" value={action} onChange={(event) => updateAction(event.currentTarget.value)}>
            {auditActionOptions.map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="pagination-copy">
          {loading ? "Loading audit entries..." : `${view.totalEntries} entries - page ${view.currentPage} of ${view.totalPages}`}
        </div>
      </div>
      <table className="data-table dense-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Market</th>
            <th>Metadata</th>
          </tr>
        </thead>
        <tbody>
          {view.entries.length ? (
            view.entries.map((entry) => (
              <tr key={entry.id}>
                <td data-label="Time">{entry.timestamp.slice(0, 16).replace("T", " ")}</td>
                <td data-label="Actor">{entry.actor_name || entry.actor_id || "System"}</td>
                <td data-label="Action">{readableAction(entry.action)}</td>
                <td data-label="Market">{entry.market_title || entry.market_id || "None"}</td>
                <td data-label="Metadata">{metadataSummary(entry.metadata) || "No metadata"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td data-label="Audit log" colSpan="5">
                <div className="empty-note">
                  {loading ? "Loading audit entries..." : "No audit entries match this filter."}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="pagination-controls">
        <button className="btn btn-ghost" type="button" disabled={loading || view.currentPage === 1} onClick={() => setPage((value) => value - 1)}>
          Previous
        </button>
        <button className="btn btn-secondary" type="button" disabled={loading || view.currentPage === view.totalPages} onClick={() => setPage((value) => value + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
