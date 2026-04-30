"use client";

import { useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { money } from "../../lib/formatters";
import { InfoRow, SectionHead } from "../ui";

const depositMethods = [
  {
    id: "bank",
    name: "Bank account",
    detail: "ACH transfer",
    badge: "Best for larger deposits",
    mark: "BA",
  },
  {
    id: "card",
    name: "Credit card",
    detail: "Visa, Mastercard, Amex",
    badge: "Instant",
    mark: "CC",
  },
  {
    id: "apple",
    name: "Apple Pay",
    detail: "Use a saved wallet card",
    badge: "Fast",
    mark: "AP",
  },
  {
    id: "google",
    name: "Google Pay",
    detail: "Use a saved wallet card",
    badge: "Fast",
    mark: "GP",
  },
];

const quickDepositAmounts = [10, 25, 50, 100];

export default function DepositPage() {
  const { state, actions } = useFriendMarket();
  const [pendingAction, setPendingAction] = useState("");
  const [depositMethod, setDepositMethod] = useState("bank");
  const selectedDepositMethod = depositMethods.find((method) => method.id === depositMethod) || depositMethods[0];
  const depositAmount = Math.max(0, Number(state.fundingDrafts.depositAmount) || 0);

  async function runDeposit() {
    if (pendingAction) return;
    setPendingAction("deposit");
    try {
      await actions.addDeposit();
    } finally {
      setPendingAction("");
    }
  }

  return (
    <section className="page active money-page">
      <SectionHead
        title="Deposit"
        body="Choose a funding method and add play credit."
      />

      <div className="list-card deposit-card money-card">
        <div className="deposit-card-head">
          <div>
            <h3>Add funds</h3>
            <p>Connect a bank account, card, or wallet to deposit.</p>
          </div>
          <span className="pill">Secure demo flow</span>
        </div>

        <div className="deposit-method-grid" role="list" aria-label="Deposit payment methods">
          {depositMethods.map((method) => (
            <button
              className={`deposit-method ${depositMethod === method.id ? "active" : ""}`}
              type="button"
              key={method.id}
              onClick={() => setDepositMethod(method.id)}
              aria-pressed={depositMethod === method.id}
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
            <label className="field deposit-amount-field" htmlFor="deposit-amount">
              <span className="label">Amount</span>
              <span className="money-input">
                <span aria-hidden="true">$</span>
                <input
                  id="deposit-amount"
                  type="number"
                  min="1"
                  inputMode="decimal"
                  value={state.fundingDrafts.depositAmount}
                  onChange={(event) => actions.updateFundingDraft("depositAmount", event.currentTarget.value)}
                />
              </span>
            </label>
            <button className="btn btn-primary deposit-submit" type="button" disabled={!!pendingAction} onClick={runDeposit}>
              {pendingAction === "deposit" ? "Adding..." : `Deposit with ${selectedDepositMethod.name}`}
            </button>
          </div>

          <div className="quick-amount-grid" aria-label="Quick deposit amounts">
            {quickDepositAmounts.map((amount) => (
              <button
                className="quick-amount"
                type="button"
                key={amount}
                onClick={() => actions.updateFundingDraft("depositAmount", amount)}
              >
                {money(amount)}
              </button>
            ))}
          </div>

          <div className="deposit-summary">
            <InfoRow label="Funding source" value={selectedDepositMethod.name} />
            <InfoRow label="Available now" value={money(state.currentUser.withdrawable_balance)} />
            <InfoRow label="Available after deposit" value={money(state.currentUser.withdrawable_balance + depositAmount)} />
          </div>
        </div>
      </div>
    </section>
  );
}
