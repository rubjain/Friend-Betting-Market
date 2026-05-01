"use client";

import { useState } from "react";
import { useFriendMarket } from "../context/FriendMarketContext";
import {
  buildLedgerExportRows,
  buildRiskReviewExportRows,
  ledgerExportColumns,
  riskReviewExportColumns,
  toCsv,
} from "../lib/exporters";
import { money, titleCase } from "../lib/formatters";
import AdminDisputeQueue from "./AdminDisputeQueue";
import AdminDraftMarkets from "./AdminDraftMarkets";
import AdminInsights from "./AdminInsights";
import AdminAuditTable from "./AdminAuditTable";
import AdminLedgerTable from "./AdminLedgerTable";
import ConfirmDialog from "./ConfirmDialog";
import RiskReviewQueue from "./RiskReviewQueue";
import { InfoRow } from "./ui";

export default function AdminDashboard() {
  const { state, actions } = useFriendMarket();
  const [confirmation, setConfirmation] = useState(null);
  const [pendingAction, setPendingAction] = useState("");
  const riskUsers = state.users.filter((user) => user.risk_status !== "clear" || user.risk_score >= 40);
  const totalBonusBalances = state.users.reduce((sum, user) => sum + user.bonus_balance, 0);
  const frozenUsers = state.users.filter((user) => user.frozen).length;

  if (!state.currentUser.isAdmin) {
    return (
      <section className="page active">
        <div className="list-card">
          <h3>Admin dashboard</h3>
          <p>This view is hidden unless admin mode is enabled.</p>
        </div>
      </section>
    );
  }

  async function runAdminAction(actionKey, callback) {
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      return await callback();
    } finally {
      setPendingAction("");
    }
  }

  function updateAdminField(event) {
    const rawValue = event.currentTarget.value;
    const normalizedValue = rawValue === "true" ? true : rawValue === "false" ? false : rawValue;
    runAdminAction(`config-${event.currentTarget.name}`, () =>
      actions.updateAdminConfig(event.currentTarget.name, normalizedValue),
    );
  }

  function confirmAction(config) {
    setConfirmation(config);
  }

  function cancelConfirmation() {
    setConfirmation(null);
  }

  async function runConfirmation() {
    await confirmation?.onConfirm();
    setConfirmation(null);
  }

  function downloadCsv(filename, csv) {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadCsvFromApi(url, filename, fallbackCsv) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("CSV export API failed.");
      }
      const csv = await response.text();
      downloadCsv(filename, csv);
    } catch {
      downloadCsv(filename, fallbackCsv);
    }
  }

  async function exportLedger() {
    await downloadCsvFromApi(
      "/api/admin/exports/ledger",
      "friendmarket-ledger-export.csv",
      toCsv(buildLedgerExportRows(state.ledger), ledgerExportColumns),
    );
    actions.setFlashMessage("Ledger CSV export prepared.");
  }

  async function exportRiskReview() {
    await downloadCsvFromApi(
      "/api/admin/exports/risk-review",
      "friendmarket-risk-review-export.csv",
      toCsv(buildRiskReviewExportRows(riskUsers), riskReviewExportColumns),
    );
    actions.setFlashMessage("Risk review CSV export prepared.");
  }

  return (
    <section className="page active">
      <div className="section-head">
        <div>
          <h3>Admin Dashboard</h3>
          <p>Separate operational view for market approvals, resolution, and bonus liability controls.</p>
        </div>
        <div className="inline-actions admin-head-actions">
          <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => runAdminAction("export-ledger", exportLedger)}>
            {pendingAction === "export-ledger" ? "Exporting..." : "Export ledger"}
          </button>
          <button className="btn btn-ghost" type="button" disabled={!!pendingAction} onClick={() => runAdminAction("export-risk", exportRiskReview)}>
            {pendingAction === "export-risk" ? "Exporting..." : "Export risk review"}
          </button>
        </div>
      </div>
      <div className="note-banner admin-banner">
        The MVP keeps anti-fraud checks as placeholders, but the admin model already reserves room for
        freezes, reversals, and risk review workflows.
      </div>
      <div className="admin-summary">
        <div>
          <span className="label">Bonus balances</span>
          <strong>{money(totalBonusBalances)}</strong>
        </div>
        <div>
          <span className="label">Review queue</span>
          <strong>{riskUsers.length}</strong>
        </div>
        <div>
          <span className="label">Frozen accounts</span>
          <strong>{frozenUsers}</strong>
        </div>
        <div>
          <span className="label">Company liability</span>
          <strong>{money(state.adminConfig.bonusLiability)}</strong>
        </div>
      </div>
      <div className="admin-grid">
        <AdminDraftMarkets onMessage={actions.setFlashMessage} />
        <AdminInsights users={state.users} ledger={state.ledger} activeMarkets={state.activeMarkets} />
        <div className="table-card">
          <h3>Pending markets</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Submitted by</th>
                <th>Date</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.pendingMarkets.length ? (
                state.pendingMarkets.map((market) => (
                  <tr key={market.id}>
                    <td data-label="Market">{market.title}</td>
                    <td data-label="Submitted by">{market.submittedBy}</td>
                    <td data-label="Date">{market.createdAt}</td>
                    <td data-label="Source">
                      {market.sourceUrl ? (
                        <a href={market.sourceUrl} target="_blank" rel="noreferrer">
                          Review source
                        </a>
                      ) : (
                        <span className="muted">No source URL</span>
                      )}
                    </td>
                    <td data-label="Actions">
                      <div className="inline-actions">
                        <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => runAdminAction(`approve-${market.id}`, () => actions.approveMarket(market.id))}>
                          {pendingAction === `approve-${market.id}` ? "Approving..." : "Approve"}
                        </button>
                        <button className="btn btn-ghost" type="button" disabled={!!pendingAction} onClick={() => runAdminAction(`reject-${market.id}`, () => actions.rejectMarket(market.id))}>
                          {pendingAction === `reject-${market.id}` ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td data-label="Market" colSpan="5">
                    <div className="empty-note">No markets are waiting for approval.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-card">
          <h3>Active markets</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Volume</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.activeMarkets.map((market) => (
                <tr key={market.id}>
                  <td data-label="Market">{market.title}</td>
                  <td data-label="Volume">{money(market.volume)}</td>
                  <td data-label="Status">{market.status}</td>
                  <td data-label="Actions">
                    <div className="inline-actions">
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={!!pendingAction}
                        onClick={() =>
                          confirmAction({
                            title: "Resolve market as YES?",
                            body: `This will settle open bets for "${market.title}" and write payout ledger entries.`,
                            confirmLabel: "Resolve YES",
                            onConfirm: () => runAdminAction(`resolve-yes-${market.id}`, () => actions.resolveActiveMarket(market.id, "YES")),
                          })
                        }
                      >
                        Resolve Yes
                      </button>
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={!!pendingAction}
                        onClick={() =>
                          runAdminAction(`lifecycle-${market.id}`, () =>
                            actions.updateMarketLifecycle(
                              market.id,
                              market.status === "Paused" ? "active" : "paused",
                            ),
                          )
                        }
                      >
                        {pendingAction === `lifecycle-${market.id}` ? "Updating..." : market.status === "Paused" ? "Resume" : "Pause"}
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={!!pendingAction}
                        onClick={() =>
                          confirmAction({
                            title: "Resolve market as NO?",
                            body: `This will settle open bets for "${market.title}" and write payout ledger entries.`,
                            confirmLabel: "Resolve NO",
                            onConfirm: () => runAdminAction(`resolve-no-${market.id}`, () => actions.resolveActiveMarket(market.id, "NO")),
                          })
                        }
                      >
                        Resolve No
                      </button>
                      <button
                        className="btn btn-ghost"
                        type="button"
                        disabled={!!pendingAction}
                        onClick={() =>
                          confirmAction({
                            title: "Void and refund market?",
                            body: `This will void "${market.title}", refund original open stakes by funding source, and write refund ledger entries.`,
                            confirmLabel: "Void market",
                            onConfirm: () => runAdminAction(`void-${market.id}`, () => actions.resolveActiveMarket(market.id, "VOID")),
                          })
                        }
                      >
                        Void / Refund
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-card">
          <h3>Social boost controls</h3>
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="boost-enabled">
                Social boosts
              </label>
              <select id="boost-enabled" name="socialBoostsEnabled" value={String(state.adminConfig.socialBoostsEnabled)} onChange={updateAdminField}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <AdminNumberField id="max-group-size" name="maxGroupSize" label="Max group size" value={state.adminConfig.maxGroupSize} onChange={updateAdminField} min="1" />
            <AdminNumberField id="per-friend" name="multiplierPerFriend" label="Multiplier per friend" value={state.adminConfig.multiplierPerFriend} onChange={updateAdminField} min="0" max="1" step="0.01" />
            <AdminNumberField id="max-multiplier" name="maxMultiplier" label="Max multiplier" value={state.adminConfig.maxMultiplier} onChange={updateAdminField} min="1" max="5" step="0.01" />
            <div className="field">
              <label className="label" htmlFor="bonus-funds-eligibility">
                Bonus fund markets
              </label>
              <select id="bonus-funds-eligibility" name="bonusFundsEligibility" value={state.adminConfig.bonusFundsEligibility} onChange={updateAdminField}>
                <option value="eligible_only">Eligible markets only</option>
                <option value="all_markets">All markets</option>
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="bonus-usage-mode">
                Bonus usage mode
              </label>
              <select id="bonus-usage-mode" name="bonusUsageMode" value={state.adminConfig.bonusUsageMode} onChange={updateAdminField}>
                <option value="partial">Partial use allowed</option>
                <option value="full">Bonus first</option>
                <option value="none">Disabled</option>
              </select>
            </div>
            <AdminNumberField id="max-bonus-stake-percent" name="maxBonusStakePercent" label="Max bonus stake %" value={state.adminConfig.maxBonusStakePercent} onChange={updateAdminField} min="0" max="100" step="1" />
          </div>
        </div>
        <div className="table-card">
          <h3>Bonus liability overview</h3>
          <div className="form-grid">
            <AdminNumberField id="max-bonus-user" name="maxBonusPayoutPerUser" label="Max bonus payout per user" value={state.adminConfig.maxBonusPayoutPerUser} onChange={updateAdminField} min="0" step="1" />
            <AdminNumberField id="max-bonus-market" name="maxBonusPayoutPerMarket" label="Max bonus payout per market" value={state.adminConfig.maxBonusPayoutPerMarket} onChange={updateAdminField} min="0" step="1" />
            <AdminNumberField id="daily-bonus-limit" name="dailyBonusPayoutLimit" label="Daily bonus payout limit" value={state.adminConfig.dailyBonusPayoutLimit} onChange={updateAdminField} min="0" step="1" />
            <AdminNumberField id="bonus-liability" name="bonusLiability" label="Company bonus liability" value={state.adminConfig.bonusLiability} onChange={updateAdminField} min="0" step="1" />
          </div>
        </div>
        <div className="table-card">
          <h3>Resolve markets</h3>
          <p>Settlement should route normal winnings by original funding ratio and social boosts to bonus balance only.</p>
          <div className="admin-list">
            <InfoRow label="Ledger split rule" value="Proportional by stake source" />
            <InfoRow label="Bonus-funded winnings" value="Return to bonus balance" />
            <InfoRow label="Mixed-fund winnings" value="Split by original ratios" />
            <InfoRow label="Void path" value="Refund original stake by funding source" />
          </div>
        </div>
        <RiskReviewQueue users={riskUsers} pendingAction={pendingAction} runAction={runAdminAction} onConfirmAction={confirmAction} />
        <AdminDisputeQueue onMessage={actions.setFlashMessage} />
        <AdminAuditTable />
        <AdminLedgerTable ledger={state.ledger} />
        <div className="table-card">
          <h3>User and ledger overview</h3>
          <div className="admin-list">
            <InfoRow label="Users needing review" value={riskUsers.length} />
            <InfoRow label="Frozen accounts" value={frozenUsers} />
            <InfoRow label="Latest ledger source types" value="deposit, bet_placed, market_payout, social_boost" />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Withdrawable</th>
                <th>Bonus</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {state.users.map((user) => (
                <tr key={user.id}>
                  <td data-label="User">{user.name}</td>
                  <td data-label="Withdrawable">{money(user.withdrawable_balance)}</td>
                  <td data-label="Bonus">{money(user.bonus_balance)}</td>
                  <td data-label="Risk">{titleCase(user.risk_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-card">
          <h3>Resolved markets</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Market</th>
                <th>Result</th>
                <th>Date</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {state.resolvedMarkets.map((market) => (
                <tr key={market.id}>
                  <td data-label="Market">{market.title}</td>
                  <td data-label="Result">{market.result}</td>
                  <td data-label="Date">{market.resolvedAt}</td>
                  <td data-label="Evidence">
                    {market.evidenceLinks?.length ? (
                      market.evidenceLinks.map((source) => (
                        source.url ? (
                          <a key={`${market.id}-${source.label}`} href={source.url} target="_blank" rel="noreferrer">
                            {source.label}
                          </a>
                        ) : (
                          <span key={`${market.id}-${source.label}`}>{source.label}</span>
                        )
                      ))
                    ) : (
                      <span className="muted">No evidence attached</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-card">
          <h3>Demo controls</h3>
          <p>Useful while iterating on the client-side MVP.</p>
          <div className="inline-actions">
            <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => runAdminAction("grant-bonus", actions.grantDemoBonus)}>
              {pendingAction === "grant-bonus" ? "Granting..." : "Grant $10 bonus"}
            </button>
            <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => runAdminAction("deposit", actions.addDemoDeposit)}>
              {pendingAction === "deposit" ? "Adding..." : "Add $25 deposit"}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={!!pendingAction}
              onClick={() =>
                confirmAction({
                  title: "Reset demo state?",
                  body: "This clears local demo state and restores the default sample markets, balances, friends, and ledger.",
                  confirmLabel: "Reset demo",
                  onConfirm: () => runAdminAction("reset", actions.resetDemoState),
                })
              }
            >
              Reset demo state
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmation}
        title={confirmation?.title}
        body={confirmation?.body}
        confirmLabel={confirmation?.confirmLabel}
        tone={confirmation?.tone}
        onCancel={cancelConfirmation}
        onConfirm={runConfirmation}
      />
    </section>
  );
}

function AdminNumberField({ id, name, label, value, onChange, min, max, step }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} name={name} type="number" min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );
}
