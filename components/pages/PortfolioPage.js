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

  return (
    <section className="page active">
      <SectionHead
        title="Portfolio"
        body="Open bets, settled history, and separate play-money balances that mirror a real-money architecture."
      />
      <div className="portfolio-grid">
        <div className="list-card">
          <h3>Balances</h3>
          <div className="portfolio-balance">
            <BalanceBox
              label="Withdrawable balance"
              value={money(state.currentUser.withdrawable_balance)}
              body="Comes from deposits and normal winnings tied to withdrawable funds."
            />
            <BalanceBox
              label="Bonus balance"
              value={money(state.currentUser.bonus_balance)}
              body="Comes from social boosts, promotions, referrals, and bonus-funded winnings."
            />
            <BalanceBox
              label="Play-credit balance"
              value={money(state.currentUser.play_credit_balance)}
              body="Displayed as a friendly total, but still backed by separate ledger currencies."
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
        <PortfolioLedger />
        <div className="list-card">
          <h3>Open bets</h3>
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
