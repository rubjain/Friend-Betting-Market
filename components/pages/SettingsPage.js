"use client";

import { useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { money } from "../../lib/formatters";
import PortfolioLedger from "../PortfolioLedger";
import { InfoRow, SectionHead } from "../ui";

const settingsSections = [
  ["#account", "Account"],
  ["#balances", "Balances"],
  ["#appearance", "Appearance"],
  ["#referrals", "Referrals"],
  ["#ledger", "Transaction history"],
];

export default function SettingsPage() {
  const { state, actions } = useFriendMarket();
  const [pendingAction, setPendingAction] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState(state.currentUser.email);

  async function run(actionKey, callback) {
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      await callback();
    } finally {
      setPendingAction("");
    }
  }

  return (
    <section className="page active">
      <SectionHead
        title="Settings"
        body="Account, appearance, referrals, and transaction history in one clean control center."
      />

      <nav className="settings-section-menu" aria-label="Settings sections">
        {settingsSections.map(([href, label]) => (
          <a href={href} key={href}>
            {label}
          </a>
        ))}
      </nav>

      <div className="settings-command-grid">
        <div className="list-card settings-hero-card settings-anchor" id="account">
          <h3>Account</h3>
          <div className="info-list">
            <InfoRow label="Session" value={state.auth.authenticated ? "Signed in" : "Demo guest"} />
            <InfoRow label="Email" value={state.currentUser.email} />
            <InfoRow label="Username" value={state.currentUser.username} />
          </div>
          {state.auth.authenticated ? (
            <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => run("logout", actions.logout)}>
              {pendingAction === "logout" ? "Logging out..." : "Log out"}
            </button>
          ) : (
            <form className="settings-inline-form" onSubmit={(event) => {
              event.preventDefault();
              run("login", () => actions.login(loginIdentifier));
            }}>
              <label className="field" htmlFor="settings-login">
                <span className="label">Email or username</span>
                <input
                  id="settings-login"
                  value={loginIdentifier}
                  onChange={(event) => setLoginIdentifier(event.currentTarget.value)}
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={!!pendingAction}>
                {pendingAction === "login" ? "Logging in..." : "Log in"}
              </button>
            </form>
          )}
        </div>

        <div className="list-card settings-anchor" id="appearance">
          <h3>Appearance</h3>
          <div className="theme-choice-grid">
            <button
              className={`choice-card ${state.theme === "light" ? "active" : ""}`}
              type="button"
              onClick={() => actions.setTheme("light")}
            >
              <span>Light</span>
              <strong>Clean daylight workspace</strong>
            </button>
            <button
              className={`choice-card ${state.theme === "dark" ? "active" : ""}`}
              type="button"
              onClick={() => actions.setTheme("dark")}
            >
              <span>Dark</span>
              <strong>Low-glare trading view</strong>
            </button>
          </div>
        </div>

        <div className="list-card settings-anchor" id="balances">
          <h3>Balances</h3>
          <div className="balance-mini-grid">
            <InfoRow label="Withdrawable" value={money(state.currentUser.withdrawable_balance)} />
            <InfoRow label="Bonus" value={money(state.currentUser.bonus_balance)} />
            <InfoRow label="Total play credit" value={money(state.currentUser.play_credit_balance)} />
          </div>
        </div>

        <div className="list-card settings-referrals-card settings-anchor" id="referrals">
          <h3>Referrals</h3>
          <div className="info-list">
            <InfoRow label="Your code" value={state.referrals.code} />
            <InfoRow label="Reward" value={`${money(state.referrals.reward)} bonus`} />
            <InfoRow label="Completed" value={state.referrals.completedReferrals} />
          </div>
          <div className="settings-inline-form referral-code-form">
            <label className="field" htmlFor="referral-code">
              <span className="label">Apply code</span>
              <input
                id="referral-code"
                value={state.fundingDrafts.referralCode}
                onChange={(event) => actions.updateFundingDraft("referralCode", event.currentTarget.value)}
              />
            </label>
            <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => run("referral", actions.applyReferral)}>
              {pendingAction === "referral" ? "Applying..." : "Apply referral"}
            </button>
          </div>
          <div className="referral-list">
            {state.referrals.history.map((item) => (
              <div className="ledger-row" key={item.id}>
                <div>
                  <strong>{item.friend}</strong>
                  <div className="caption">{item.status} / {item.date}</div>
                </div>
                <strong>{money(item.amount)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-ledger-card settings-anchor" id="ledger">
          <PortfolioLedger />
        </div>
      </div>
    </section>
  );
}
