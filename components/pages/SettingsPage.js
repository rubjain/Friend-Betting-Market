"use client";

import { useState } from "react";
import Link from "next/link";
import { useAgora } from "../../context/AgoraContext";
import { money } from "../../lib/formatters";
import PortfolioLedger from "../PortfolioLedger";
import ComplianceVerificationPanel from "../ComplianceVerificationPanel";
import { InfoRow, SectionHead } from "../ui";

const settingsSections = [
  ["#account", "Account"],
  ["#balances", "Balances"],
  ["#paper-trading", "Paper trading"],
  ["#compliance", "Compliance"],
  ["#appearance", "Appearance"],
  ["#referrals", "Referrals"],
  ["#ledger", "Transaction history"],
];

export default function SettingsPage() {
  const { state, actions } = useAgora();
  const [pendingAction, setPendingAction] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState(state.currentUser.email);
  const [loginPassword, setLoginPassword] = useState("password123");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [depositLimitDraft, setDepositLimitDraft] = useState(String(state.currentUser.settings.dailyDepositLimit ?? 500));
  const [selfExcludeDays, setSelfExcludeDays] = useState("0");
  const [responsibleMessage, setResponsibleMessage] = useState("");
  const [responsibleError, setResponsibleError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const passwordWeak = newPassword.length > 0 && newPassword.length < 8;
  const canChangePassword =
    currentPassword &&
    newPassword.length >= 8 &&
    newPassword === confirmPassword &&
    !pendingAction;

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
          <div className="settings-inline-actions">
            <button
              className="btn btn-secondary"
              type="button"
              disabled={!!pendingAction}
              onClick={() =>
                run("sync", async () => {
                  const ok = await actions.refreshSessionFromServer();
                  if (ok) {
                    actions.setFlashMessage("Synced latest data from the server.");
                  }
                })
              }
            >
              {pendingAction === "sync" ? "Syncing..." : "Sync latest data"}
            </button>
            {state.auth.authenticated ? (
              <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => run("logout", actions.logout)}>
                {pendingAction === "logout" ? "Logging out..." : "Log out"}
              </button>
            ) : null}
          </div>
          {!state.auth.authenticated ? (
            <form
              className="settings-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                run("login", () => actions.login(loginIdentifier, loginPassword));
              }}
            >
              <label className="field" htmlFor="settings-login">
                <span className="label">Email or username</span>
                <input
                  id="settings-login"
                  value={loginIdentifier}
                  onChange={(event) => setLoginIdentifier(event.currentTarget.value)}
                />
              </label>
              <label className="field" htmlFor="settings-login-password">
                <span className="label">Password</span>
                <input
                  id="settings-login-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.currentTarget.value)}
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={!!pendingAction}>
                {pendingAction === "login" ? "Logging in..." : "Log in"}
              </button>
            </form>
          ) : null}
          {state.auth.authenticated ? (
            <form
              className="settings-inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (!canChangePassword) return;
                run("password", async () => {
                  setPasswordMessage("");
                  setPasswordError("");
                  try {
                    const response = await fetch("/api/auth/change-password", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        currentPassword,
                        newPassword,
                      }),
                    });
                    const payload = await response.json();
                    if (!response.ok) {
                      setPasswordError(payload.message || "Could not update password.");
                      return;
                    }
                    setPasswordMessage(payload.message || "Password updated.");
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  } catch {
                    setPasswordError("Something went wrong. Try again.");
                  }
                });
              }}
            >
              <h4 style={{ margin: "16px 0 8px" }}>Change password</h4>
              <label className="field" htmlFor="settings-current-password">
                <span className="label">Current password</span>
                <input
                  id="settings-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.currentTarget.value)}
                />
              </label>
              <label className="field" htmlFor="settings-new-password">
                <span className="label">New password</span>
                <input
                  id="settings-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.currentTarget.value)}
                />
                {passwordWeak ? (
                  <span style={{ color: "#c62828", fontSize: "13px" }}>Password must be at least 8 characters.</span>
                ) : null}
              </label>
              <label className="field" htmlFor="settings-confirm-password">
                <span className="label">Confirm new password</span>
                <input
                  id="settings-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.currentTarget.value)}
                />
                {passwordMismatch ? (
                  <span style={{ color: "#c62828", fontSize: "13px" }}>Passwords do not match.</span>
                ) : null}
              </label>
              {passwordMessage ? <p className="auth-success">{passwordMessage}</p> : null}
              {passwordError ? <p className="auth-error">{passwordError}</p> : null}
              <button className="btn btn-secondary" type="submit" disabled={!canChangePassword || !!pendingAction}>
                {pendingAction === "password" ? "Updating..." : "Update password"}
              </button>
              <Link href="/forgot-password" style={{ fontSize: "13px", color: "#e85d04" }}>
                Forgot current password?
              </Link>
            </form>
          ) : null}
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

        <div className="list-card settings-anchor" id="paper-trading">
          <h3>Paper trading</h3>
          <p className="settings-section-body">Practice prediction markets with $10,000 of virtual money. Your paper P&amp;L is tracked separately from your real account — no real funds at risk.</p>
          <div className="paper-settings-row">
            <div className="paper-settings-info">
              <span className="label">Paper balance</span>
              <strong className="paper-balance-value">{money(state.currentUser.paper_balance ?? 0)}</strong>
            </div>
            <div className="inline-actions">
              <button
                className={`btn ${state.paperMode ? "paper-mode-exit" : "btn-primary paper-start-btn"}`}
                type="button"
                onClick={actions.togglePaperMode}
              >
                {state.paperMode ? "Exit paper mode" : "Start paper trading"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={actions.resetPaperBalance}>
                Reset to $10,000
              </button>
            </div>
          </div>
          {state.paperMode && (
            <p className="paper-mode-active-note">
              <span className="paper-mode-pill" style={{ marginRight: 6 }}>ACTIVE</span>
              Paper mode is on. All bets placed use your virtual balance.
            </p>
          )}
        </div>

        <div className="list-card settings-anchor" id="balances">
          <h3>Balances</h3>
          <div className="balance-mini-grid">
            <InfoRow label="Withdrawable" value={money(state.currentUser.withdrawable_balance)} />
            <InfoRow label="Bonus" value={money(state.currentUser.bonus_balance)} />
            <InfoRow label="Total play credit" value={money(state.currentUser.play_credit_balance)} />
          </div>
        </div>

        <div className="list-card settings-anchor" id="compliance">
          <h3>Compliance gates</h3>
          <ComplianceVerificationPanel />
          <div className="balance-mini-grid" style={{ marginTop: "16px" }}>
            <InfoRow label="Daily deposit limit" value={money(state.currentUser.settings.dailyDepositLimit)} />
            <InfoRow
              label="Self-exclusion"
              value={state.currentUser.settings.selfExcludedUntil ? "Cooling off" : "Off"}
            />
          </div>
          {state.auth.authenticated ? (
            <form
              className="settings-inline-form compliance-form"
              onSubmit={(event) => {
                event.preventDefault();
                run("responsible", async () => {
                  setResponsibleMessage("");
                  setResponsibleError("");
                  const result = await actions.updateResponsibleUse({
                    dailyDepositLimit: Number(depositLimitDraft),
                    selfExcludedDays: Number(selfExcludeDays),
                  });
                  if (!result.ok) {
                    setResponsibleError(result.message || "Could not update settings.");
                    return;
                  }
                  setResponsibleMessage(result.message || "Responsible-use settings updated.");
                });
              }}
            >
              <h4>Responsible use</h4>
              <label className="field" htmlFor="settings-deposit-limit">
                <span className="label">Daily deposit limit</span>
                <input
                  id="settings-deposit-limit"
                  type="number"
                  min="0"
                  max="10000"
                  value={depositLimitDraft}
                  onChange={(event) => setDepositLimitDraft(event.currentTarget.value)}
                />
              </label>
              <label className="field" htmlFor="settings-self-exclude">
                <span className="label">Self-exclusion (days, 0 to clear)</span>
                <select
                  id="settings-self-exclude"
                  value={selfExcludeDays}
                  onChange={(event) => setSelfExcludeDays(event.currentTarget.value)}
                >
                  <option value="0">Not excluded</option>
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="180">180 days</option>
                </select>
              </label>
              {responsibleMessage ? <p className="auth-success">{responsibleMessage}</p> : null}
              {responsibleError ? <p className="auth-error">{responsibleError}</p> : null}
              <button className="btn btn-secondary" type="submit" disabled={!!pendingAction}>
                {pendingAction === "responsible" ? "Saving..." : "Save responsible-use settings"}
              </button>
            </form>
          ) : null}
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
