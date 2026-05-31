"use client";

import { useState } from "react";
import { useAgora } from "../../context/AgoraContext";
import { money } from "../../lib/formatters";
import { InfoRow, SectionHead } from "../ui";

const withdrawMethods = [
  {
    id: "bank",
    name: "Demo bank",
    detail: "Simulated ACH review",
    badge: "Paper beta",
    mark: "BA",
  },
  {
    id: "card",
    name: "Demo debit card",
    detail: "Simulated payout review",
    badge: "Paper beta",
    mark: "DC",
  },
];

const quickWithdrawAmounts = [10, 20, 50, 100];

export default function WithdrawPage() {
  const { state, actions } = useAgora();
  const [pendingAction, setPendingAction] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("bank");
  const selectedWithdrawMethod = withdrawMethods.find((method) => method.id === withdrawMethod) || withdrawMethods[0];
  const withdrawAmount = Math.max(0, Number(state.fundingDrafts.withdrawAmount) || 0);
  const remainingBalance = Math.max(0, state.currentUser.withdrawable_balance - withdrawAmount);

  async function runWithdraw() {
    if (pendingAction) return;
    setPendingAction("withdraw");
    try {
      await actions.requestWithdrawal(withdrawAmount, withdrawMethod);
    } finally {
      setPendingAction("");
    }
  }

  return (
    <section className="page active money-page">
      <SectionHead
        title="Request Simulated Withdrawal"
        body="Paper beta withdrawals are review-only ledger simulations. No real payout is sent."
      />

      <div className="list-card deposit-card money-card">
        <div className="deposit-card-head">
          <div>
            <h3>Request review</h3>
            <p>Select a demo payout method and amount for admin review.</p>
          </div>
          <span className="pill">No real payout</span>
        </div>

        <div className="deposit-method-grid compact-method-grid" role="list" aria-label="Withdrawal methods">
          {withdrawMethods.map((method) => (
            <button
              className={`deposit-method ${withdrawMethod === method.id ? "active" : ""}`}
              type="button"
              key={method.id}
              onClick={() => setWithdrawMethod(method.id)}
              aria-pressed={withdrawMethod === method.id}
            >
              <span className="method-mark" aria-hidden="true">{method.mark}</span>
              <span className="method-copy">
                <strong>{method.name}</strong>
                <span>{method.detail}</span>
              </span>
              <span className="method-badge">{method.badge}</span>
            </button>
          ))}
        </div>

        <div className="deposit-amount-panel">
          <div className="deposit-amount-row">
            <label className="field deposit-amount-field" htmlFor="withdraw-amount">
              <span className="label">Amount</span>
              <span className="money-input">
                <span aria-hidden="true">$</span>
                <input
                  id="withdraw-amount"
                  type="number"
                  min="1"
                  inputMode="decimal"
                  value={state.fundingDrafts.withdrawAmount}
                  onChange={(event) => actions.updateFundingDraft("withdrawAmount", event.currentTarget.value)}
                />
              </span>
            </label>
            <button className="btn btn-primary deposit-submit" type="button" disabled={!!pendingAction} onClick={runWithdraw}>
              {pendingAction === "withdraw" ? "Submitting..." : `Request via ${selectedWithdrawMethod.name}`}
            </button>
          </div>

          <div className="quick-amount-grid" aria-label="Quick withdrawal amounts">
            {quickWithdrawAmounts.map((amount) => (
              <button
                className="quick-amount"
                type="button"
                key={amount}
                onClick={() => actions.updateFundingDraft("withdrawAmount", amount)}
              >
                {money(amount)}
              </button>
            ))}
          </div>

          <div className="deposit-summary">
            <InfoRow label="Payout method" value={selectedWithdrawMethod.name} />
            <InfoRow label="Withdrawable balance" value={money(state.currentUser.withdrawable_balance)} />
            <InfoRow label="Balance after request" value={money(remainingBalance)} />
          </div>
        </div>
      </div>
    </section>
  );
}
