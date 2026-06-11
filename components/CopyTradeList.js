"use client";

import { money } from "../lib/formatters";

function formatStatus(trade) {
  if (trade.status === "COPIED") return trade.betStatus || "COPIED";
  if (trade.skipReason) return `Skipped (${trade.skipReason})`;
  return trade.status;
}

export default function CopyTradeList({ trades, loading }) {
  if (loading) return <div className="list-card">Loading copy history...</div>;
  if (!trades?.length) {
    return <div className="list-card empty-note">No copied trades yet.</div>;
  }

  return (
    <div className="list-card copy-trade-list">
      <h3>Copy history</h3>
      <div className="copy-trade-table">
        {trades.map((trade) => (
          <div className="copy-trade-row" key={trade.id}>
            <div>
              <strong>{trade.marketId || "Market"}</strong>
              <div className="caption">{trade.side || "—"} · {new Date(trade.createdAt).toLocaleString()}</div>
            </div>
            <div className="copy-trade-row-meta">
              <span>{money(trade.stake)}</span>
              <span className={`copy-trade-status copy-trade-status--${String(trade.status).toLowerCase()}`}>
                {formatStatus(trade)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
