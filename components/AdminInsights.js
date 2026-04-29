"use client";

import { money, titleCase } from "../lib/formatters";

export default function AdminInsights({ users, ledger, activeMarkets }) {
  const totalUserBalances = users.reduce(
    (totals, user) => ({
      withdrawable: totals.withdrawable + user.withdrawable_balance,
      bonus: totals.bonus + user.bonus_balance,
    }),
    { withdrawable: 0, bonus: 0 },
  );
  const ledgerBySource = ledger.reduce((counts, entry) => {
    counts[entry.source] = (counts[entry.source] || 0) + 1;
    return counts;
  }, {});
  const maxSourceCount = Math.max(1, ...Object.values(ledgerBySource));
  const maxMarketVolume = Math.max(1, ...activeMarkets.map((market) => market.volume));
  const riskSignals = users.reduce((counts, user) => {
    (user.risk_signals || []).forEach((signal) => {
      counts[signal] = (counts[signal] || 0) + 1;
    });
    return counts;
  }, {});
  const maxRiskSignalCount = Math.max(1, ...Object.values(riskSignals));

  return (
    <div className="table-card admin-wide">
      <div className="row-between">
        <div>
          <h3>Operations snapshot</h3>
          <p>Compact signals for liability, ledger activity, and active market exposure.</p>
        </div>
      </div>
      <div className="ops-grid">
        <div className="mini-chart">
          <h4>User balance mix</h4>
          <BarRow
            label="Withdrawable"
            value={money(totalUserBalances.withdrawable)}
            width={percentOf(totalUserBalances.withdrawable, totalUserBalances.withdrawable + totalUserBalances.bonus)}
          />
          <BarRow
            label="Bonus"
            value={money(totalUserBalances.bonus)}
            width={percentOf(totalUserBalances.bonus, totalUserBalances.withdrawable + totalUserBalances.bonus)}
          />
        </div>
        <div className="mini-chart">
          <h4>Ledger sources</h4>
          {Object.entries(ledgerBySource).length ? (
            Object.entries(ledgerBySource).map(([source, count]) => (
              <BarRow
                key={source}
                label={titleCase(source)}
                value={count}
                width={percentOf(count, maxSourceCount)}
              />
            ))
          ) : (
            <div className="empty-note">No ledger activity yet.</div>
          )}
        </div>
        <div className="mini-chart">
          <h4>Active market volume</h4>
          {activeMarkets.map((market) => (
            <BarRow
              key={market.id}
              label={market.title}
              value={money(market.volume)}
              width={percentOf(market.volume, maxMarketVolume)}
            />
          ))}
        </div>
        <div className="mini-chart">
          <h4>Risk signals</h4>
          {Object.entries(riskSignals).length ? (
            Object.entries(riskSignals).map(([signal, count]) => (
              <BarRow
                key={signal}
                label={signal}
                value={count}
                width={percentOf(count, maxRiskSignalCount)}
              />
            ))
          ) : (
            <div className="empty-note">No risk signals yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, width }) {
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="bar-track" aria-hidden="true">
        <div className="bar-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function percentOf(value, total) {
  if (!total) {
    return 0;
  }
  return Math.max(4, Math.min(100, Math.round((value / total) * 100)));
}
