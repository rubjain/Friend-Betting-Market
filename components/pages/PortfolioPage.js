"use client";

import { useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { money } from "../../lib/formatters";
import PortfolioLedger from "../PortfolioLedger";
import { SectionHead } from "../ui";

export default function PortfolioPage() {
  const { state, actions } = useFriendMarket();
  const [disputeDraft, setDisputeDraft] = useState({ betId: "", reason: "" });
  const [pendingAction, setPendingAction] = useState("");
  const [showTxHistory, setShowTxHistory] = useState(false);

  async function runPortfolioAction(actionKey, callback) {
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      return await callback();
    } finally {
      setPendingAction("");
    }
  }

  async function submitDispute(bet) {
    const ok = await runPortfolioAction(`dispute-${bet.id}`, () =>
      actions.submitDispute({
        marketId: bet.marketId,
        betId: bet.id,
        reason: disputeDraft.reason,
      }),
    );
    if (ok) {
      setDisputeDraft({ betId: "", reason: "" });
    }
  }

  const totalBalance =
    (state.currentUser.withdrawable_balance ?? 0) +
    (state.currentUser.bonus_balance ?? 0) +
    (state.currentUser.play_credit_balance ?? 0);

  return (
    <section className="page active">
      <SectionHead
        title="Portfolio"
        body="Open bets, settled history, and separate play-money balances that mirror a real-money architecture."
      />
      <div className="portfolio-stack">
        {/* ── 1. Balance hero ── */}
        <div className="balance-hero">
          <div className="balance-hero-total">
            <span className="label">Total balance</span>
            <strong>{money(totalBalance)}</strong>
          </div>
          <div className="balance-hero-breakdown">
            <BalanceBox
              label="Withdrawable"
              value={money(state.currentUser.withdrawable_balance)}
              body="Deposits and normal winnings."
            />
            <BalanceBox
              label="Bonus"
              value={money(state.currentUser.bonus_balance)}
              body="Social boosts, promos, referrals."
            />
            <BalanceBox
              label="Play credit"
              value={money(state.currentUser.play_credit_balance)}
              body="Backed by separate ledger currencies."
            />
          </div>
          <div className="inline-actions">
            <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => runPortfolioAction("deposit", actions.addDemoDeposit)}>
              {pendingAction === "deposit" ? "Adding..." : "Add $25 Deposit"}
            </button>
            <button className="btn btn-ghost" type="button" disabled={!!pendingAction} onClick={() => runPortfolioAction("bonus", actions.grantDemoBonus)}>
              {pendingAction === "bonus" ? "Granting..." : "Grant $10 Bonus"}
            </button>
          </div>
        </div>

        {/* ── 2. Open bets (visual hero) ── */}
        <div className="list-card open-bets-hero">
          <h2 className="open-bets-heading">Open bets</h2>
          <div className="bet-list">
            {state.portfolio.openBets.length ? (
              state.portfolio.openBets.map((bet) => (
                <div className="bet-row" key={bet.id}>
                  <div>
                    <strong>{bet.market}</strong>
                    <div className="caption">
                      {bet.side} &middot; {money(bet.stake)} &middot; {bet.funding}
                    </div>
                  </div>
                  <span className="pill">{bet.status}</span>
                </div>
              ))
            ) : (
              <div className="empty-note">No open bets yet.</div>
            )}
          </div>
        </div>

        {/* ── 3. Past bets ── */}
        <div className="list-card">
          <h3>Past bets</h3>
          <div className="bet-list">
            {state.portfolio.pastBets.length ? (
              state.portfolio.pastBets.map((bet, index) => (
                <div className="bet-row" key={`${bet.market}-${index}`}>
                  <div>
                    <strong>{bet.market}</strong>
                    <div className="caption">
                      {bet.side} &middot; {bet.settlement}
                    </div>
                    {disputeDraft.betId === bet.id ? (
                      <div className="dispute-box">
                        <label className="label" htmlFor={`dispute-${bet.id}`}>
                          Dispute reason
                        </label>
                        <textarea
                          id={`dispute-${bet.id}`}
                          rows="3"
                          value={disputeDraft.reason}
                          onChange={(event) =>
                            setDisputeDraft((draft) => ({ ...draft, reason: event.currentTarget.value }))
                          }
                          placeholder="Explain what evidence or settlement detail should be reviewed."
                        />
                        <div className="inline-actions">
                          <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => submitDispute(bet)}>
                            {pendingAction === `dispute-${bet.id}` ? "Submitting..." : "Submit dispute"}
                          </button>
                          <button className="btn btn-ghost" type="button" disabled={!!pendingAction} onClick={() => setDisputeDraft({ betId: "", reason: "" })}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="bet-row-actions">
                    <strong>{money(bet.payout + bet.boost)}</strong>
                    {bet.marketId && bet.id ? (
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => setDisputeDraft({ betId: bet.id, reason: "" })}
                      >
                        Dispute
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-note">No settled bets yet.</div>
            )}
          </div>
        </div>

        {/* ── 4. Transaction history (collapsed by default) ── */}
        <div className="txn-collapse-wrap">
          <button
            className="txn-toggle"
            type="button"
            onClick={() => setShowTxHistory((v) => !v)}
            aria-expanded={showTxHistory}
          >
            <span>{showTxHistory ? "Hide transaction history" : "Show transaction history"}</span>
            <span className="txn-toggle-chevron" aria-hidden="true">{showTxHistory ? "▲" : "▼"}</span>
          </button>
          {showTxHistory && <PortfolioLedger />}
        </div>
      </div>
    </section>
  );
}

function BalanceBox({ label, value, body }) {
  return (
    <div className="balance-box">
      <span className="label">{label}</span>
      <strong>{value}</strong>
      <span className="caption">{body}</span>
    </div>
  );
}
