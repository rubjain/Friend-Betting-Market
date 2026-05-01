"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { money } from "../../lib/formatters";
import PortfolioChart from "../PortfolioChart";

export default function ProfilePage() {
  const { state, actions } = useFriendMarket();
  const [profileDraft, setProfileDraft] = useState({
    name: state.currentUser.name,
    email: state.currentUser.email,
    username: state.currentUser.username,
  });
  const [loginIdentifier, setLoginIdentifier] = useState(state.currentUser.email);
  const [loginPassword, setLoginPassword] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  useEffect(() => {
    setProfileDraft({
      name: state.currentUser.name,
      email: state.currentUser.email,
      username: state.currentUser.username,
    });
  }, [state.currentUser.name, state.currentUser.email, state.currentUser.username]);

  async function saveProfile(event) {
    event.preventDefault();
    if (pendingAction) return;
    setPendingAction("profile");
    try {
      await actions.updateProfile(profileDraft);
    } finally {
      setPendingAction("");
    }
  }

  async function login(event) {
    event.preventDefault();
    if (pendingAction) return;
    setPendingAction("login");
    try {
      await actions.login(loginIdentifier, loginPassword);
    } finally {
      setPendingAction("");
    }
  }

  async function logout() {
    if (pendingAction) return;
    setPendingAction("logout");
    try {
      await actions.logout();
    } finally {
      setPendingAction("");
    }
  }

  if (!state.auth.authenticated) {
    return <LoginView loginIdentifier={loginIdentifier} setLoginIdentifier={setLoginIdentifier} loginPassword={loginPassword} setLoginPassword={setLoginPassword} pendingAction={pendingAction} onLogin={login} />;
  }

  const totalBalance =
    (state.currentUser.withdrawable_balance ?? 0) +
    (state.currentUser.bonus_balance ?? 0) +
    (state.currentUser.play_credit_balance ?? 0);

  const pastBets = state.portfolio.pastBets;
  const totalBets = state.portfolio.openBets.length + pastBets.length;
  const wins = pastBets.filter((b) => (b.payout ?? 0) > 0).length;
  const winRate = pastBets.length > 0 ? Math.round((wins / pastBets.length) * 100) : 0;
  const totalWinnings = pastBets.reduce((sum, b) => sum + (b.payout ?? 0) + (b.boost ?? 0), 0);

  const initials = state.currentUser.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <section className="page active">
      <div className="profile-stack">

        {/* ── Avatar + identity ── */}
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">{initials}</div>
          <div>
            <h2 className="profile-identity-name">{state.currentUser.name}</h2>
            <div className="profile-identity-username caption">
              @{state.currentUser.username.replace("@", "")}
            </div>
          </div>
        </div>

        {/* ── Balance card ── */}
        <div className="profile-balance-card">
          <div>
            <div className="label">Total balance</div>
            <strong className="profile-balance-total">{money(totalBalance)}</strong>
          </div>
          <Link href="/deposit" className="btn btn-primary">
            Deposit
          </Link>
        </div>

        {/* ── Portfolio performance chart ── */}
        <PortfolioChart />

        {/* ── Edit profile ── */}
        <div className="list-card profile-account-card">
          <h3>Account</h3>
          <form onSubmit={saveProfile}>
            <div className="profile-edit-fields">
              <div className="field">
                <label className="label" htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  value={profileDraft.name}
                  autoComplete="name"
                  onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.currentTarget.value }))}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  value={profileDraft.email}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, email: e.currentTarget.value }))}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="profile-username">Username</label>
                <input
                  id="profile-username"
                  autoComplete="username"
                  value={profileDraft.username}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, username: e.currentTarget.value }))}
                />
              </div>
            </div>
            <div className="profile-save-row">
              <button className="btn btn-primary" type="submit" disabled={!!pendingAction}>
                {pendingAction === "profile" ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Stats row ── */}
        <div className="profile-stats-row">
          <div className="profile-stat">
            <strong>{totalBets}</strong>
            <span>Bets placed</span>
          </div>
          <div className="profile-stat-divider" aria-hidden="true" />
          <div className="profile-stat">
            <strong>{winRate}%</strong>
            <span>Win rate</span>
          </div>
          <div className="profile-stat-divider" aria-hidden="true" />
          <div className="profile-stat">
            <strong>{money(totalWinnings)}</strong>
            <span>Total winnings</span>
          </div>
        </div>

        {/* ── Log out ── */}
        <button
          className="btn btn-logout"
          type="button"
          disabled={!!pendingAction}
          onClick={logout}
        >
          {pendingAction === "logout" ? "Logging out..." : "Log Out"}
        </button>

      </div>
    </section>
  );
}

function LoginView({ loginIdentifier, setLoginIdentifier, loginPassword, setLoginPassword, pendingAction, onLogin }) {
  return (
    <section className="page active">
      <div className="login-centered">
        <h1 className="login-heading">Sign in</h1>
        <form className="login-form" onSubmit={onLogin}>
          <div className="field">
            <label className="label" htmlFor="login-identifier">Email</label>
            <input
              id="login-identifier"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={loginIdentifier}
              onChange={(e) => setLoginIdentifier(e.currentTarget.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.currentTarget.value)}
            />
          </div>
          <button className="btn btn-primary login-submit" type="submit" disabled={!!pendingAction}>
            {pendingAction === "login" ? "Signing in..." : "Log In"}
          </button>
        </form>
        <p className="login-signup-link">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="login-signup-anchor">Sign up</Link>
        </p>
      </div>
    </section>
  );
}
