"use client";

import { useEffect, useState } from "react";
import { titleCase } from "../lib/formatters";

export default function AdminDisputeQueue({ onMessage }) {
  const [view, setView] = useState({ entries: [], currentPage: 1, totalPages: 1, totalEntries: 0 });
  const [status, setStatus] = useState("open");
  const [noteDrafts, setNoteDrafts] = useState({});

  useEffect(() => {
    let canceled = false;

    async function loadDisputes() {
      try {
        const params = new URLSearchParams({ status, pageSize: "20" });
        const response = await fetch(`/api/admin/disputes?${params.toString()}`);
        if (!response.ok) throw new Error("Dispute API request failed.");
        const payload = await response.json();
        if (!canceled) setView(payload);
      } catch {
        if (!canceled) setView({ entries: [], currentPage: 1, totalPages: 1, totalEntries: 0 });
      }
    }

    loadDisputes();

    return () => {
      canceled = true;
    };
  }, [status]);

  async function updateDispute(disputeId, nextStatus) {
    const response = await fetch(`/api/admin/disputes/${disputeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, note: noteDrafts[disputeId] || "" }),
    });
    const payload = await response.json();
    onMessage?.(payload.message || "Dispute updated.");
    if (response.ok) {
      setView((current) => ({
        ...current,
        entries: current.entries.filter((entry) => entry.id !== disputeId),
        totalEntries: Math.max(0, current.totalEntries - 1),
      }));
    }
  }

  return (
    <div className="table-card admin-wide">
      <div className="row-between">
        <div>
          <h3>Dispute queue</h3>
          <p>Review settlement challenges with notes captured in the audit trail.</p>
        </div>
        <label className="field compact-field" htmlFor="dispute-status-filter">
          <span className="label">Status</span>
          <select id="dispute-status-filter" value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
            <option value="open">Open</option>
            <option value="under_review">Under review</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>
      <table className="data-table dense-table">
        <thead>
          <tr>
            <th>Market</th>
            <th>User</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Review note</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {view.entries.length ? (
            view.entries.map((dispute) => (
              <tr key={dispute.id}>
                <td data-label="Market">{dispute.market_title}</td>
                <td data-label="User">{dispute.user_name}</td>
                <td data-label="Status">{titleCase(dispute.status)}</td>
                <td data-label="Reason">{dispute.reason}</td>
                <td data-label="Review note">
                  <textarea
                    className="table-note-input"
                    rows="2"
                    value={noteDrafts[dispute.id] || ""}
                    onChange={(event) =>
                      setNoteDrafts((drafts) => ({ ...drafts, [dispute.id]: event.currentTarget.value }))
                    }
                    placeholder="Optional admin note"
                  />
                </td>
                <td data-label="Actions">
                  <div className="inline-actions compact-actions">
                    <button className="btn btn-secondary" type="button" onClick={() => updateDispute(dispute.id, "UNDER_REVIEW")}>
                      Review
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => updateDispute(dispute.id, "RESOLVED")}>
                      Resolve
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => updateDispute(dispute.id, "REJECTED")}>
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td data-label="Disputes" colSpan="6">
                <div className="empty-note">No disputes match this filter.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="pagination-copy">{view.totalEntries} disputes</div>
    </div>
  );
}
