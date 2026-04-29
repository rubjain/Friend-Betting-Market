"use client";

import { useFriendMarket } from "../context/FriendMarketContext";
import { titleCase } from "../lib/formatters";

export default function RiskReviewQueue({ users, onConfirmAction }) {
  const { actions, selectors } = useFriendMarket();

  return (
    <div className="table-card">
      <h3>Risk review queue</h3>
      <p>IP and household signals are treated as context, not automatic bans.</p>
      <div className="risk-list">
        {users.length ? (
          users.map((user) => (
            <div className="risk-item" key={user.id}>
              <div className="row-between">
                <div>
                  <strong>{user.name}</strong>
                  <div className="caption">
                    {selectors.getRiskLabel(user.risk_score)} risk &middot; Score {user.risk_score}
                  </div>
                </div>
                <span className={`status-badge ${user.frozen ? "frozen" : user.risk_status}`}>
                  {titleCase(user.risk_status)}
                </span>
              </div>
              <div className="risk-signals">
                {user.risk_signals.map((signal) => (
                  <span key={signal}>{signal}</span>
                ))}
              </div>
              <div className="inline-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() =>
                    onConfirmAction({
                      title: user.frozen ? "Unfreeze account?" : "Freeze account?",
                      body: `${user.name} will be marked ${
                        user.frozen ? "unfrozen after review" : "frozen for manual review"
                      } and the admin action will be recorded in the ledger.`,
                      confirmLabel: user.frozen ? "Unfreeze" : "Freeze",
                      tone: user.frozen ? "neutral" : "danger",
                      onConfirm: () => actions.freezeUser(user.id),
                    })
                  }
                >
                  {user.frozen ? "Unfreeze" : "Freeze"}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => actions.clearRiskReview(user.id)}>
                  Clear Review
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() =>
                    onConfirmAction({
                      title: "Remove bonus credit?",
                      body: `This will remove up to $10 of bonus balance from ${user.name} and lower company bonus liability.`,
                      confirmLabel: "Remove bonus",
                      onConfirm: () => actions.removeUserBonus(user.id),
                    })
                  }
                >
                  Remove $10 Bonus
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-note">No users are currently flagged for review.</div>
        )}
      </div>
    </div>
  );
}
