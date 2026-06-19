"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

async function postJson(url, body, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  return { response, payload };
}

export default function AccountRecoveryPage() {
  const [identifier, setIdentifier] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token") || "";
    if (urlToken) setToken(urlToken);
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 8;
  const canComplete = token && password.length >= 8 && password === confirm && !pending;

  async function requestRecovery(event) {
    event.preventDefault();
    if (pending) return;
    setPending("request");
    setMessage("");
    setError("");
    try {
      const { response, payload } = await postJson("/api/auth/account-recovery", { identifier });
      if (!response.ok) {
        setError(payload.message || "Could not start account recovery.");
        return;
      }
      setSent(true);
      setMessage(payload.message || "If the account exists, recovery instructions were sent.");
      if (payload.accountRecoveryToken) {
        setToken(payload.accountRecoveryToken);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending("");
    }
  }

  async function completeRecovery(event) {
    event.preventDefault();
    if (!canComplete) return;
    setPending("recover");
    setMessage("");
    setError("");
    try {
      const { response, payload } = await postJson(
        "/api/auth/account-recovery",
        { token, password },
        "PATCH",
      );
      if (!response.ok) {
        setError(payload.message || "Could not complete recovery.");
        return;
      }
      setMessage(payload.message || "Account recovered. Sign in with your new password.");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending("");
    }
  }

  if (sent) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-head">
            <Link className="brand" href="/">
              <div className="brand-mark">AG</div>
            </Link>
            <div style={{ fontSize: "40px", margin: "8px 0" }}>📬</div>
            <h2>Check your inbox</h2>
            <p>
              We sent recovery instructions to the email on file for <strong>{identifier}</strong>.
            </p>
          </div>
          <form className="form-grid" onSubmit={completeRecovery}>
            <div className="field full">
              <label className="label" htmlFor="recovery-password">New password</label>
              <input
                id="recovery-password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {weak ? <p style={{ color: "#c62828", fontSize: "13px", margin: "4px 0 0" }}>Password must be at least 8 characters.</p> : null}
            </div>
            <div className="field full">
              <label className="label" htmlFor="recovery-confirm">Confirm new password</label>
              <input
                id="recovery-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {mismatch ? <p style={{ color: "#c62828", fontSize: "13px", margin: "4px 0 0" }}>Passwords do not match.</p> : null}
            </div>
            {message ? <p className="field full auth-success">{message}</p> : null}
            {error ? <p className="field full auth-error">{error}</p> : null}
            <div className="field full">
              <button className="btn btn-primary" type="submit" disabled={!canComplete} style={{ width: "100%" }}>
                {pending === "recover" ? "Saving..." : "Complete recovery"}
              </button>
            </div>
          </form>
          <div className="auth-foot" style={{ justifyContent: "center" }}>
            <Link href="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card-wide">
        <div className="auth-head">
          <Link className="brand" href="/">
            <div className="brand-mark">AG</div>
          </Link>
          <h2>Account recovery</h2>
          <p>
            Use this flow if you lost access or your account was frozen after risk review. We&apos;ll email
            a recovery link that sets a new password, clears other sign-in sessions, and unlocks a frozen account.
          </p>
        </div>

        <form className="form-grid" onSubmit={requestRecovery}>
          <div className="field full">
            <label className="label" htmlFor="recovery-identifier">
              Email or username
            </label>
            <input
              id="recovery-identifier"
              type="text"
              autoComplete="username email"
              value={identifier}
              onChange={(e) => setIdentifier(e.currentTarget.value)}
            />
          </div>
          {error ? <p className="field full auth-error">{error}</p> : null}
          <div className="field full">
            <button className="btn btn-primary" type="submit" disabled={!!pending} style={{ width: "100%" }}>
              {pending === "request" ? "Sending..." : "Send recovery link"}
            </button>
          </div>
        </form>

        {token ? (
          <form className="form-grid" onSubmit={completeRecovery}>
            <div className="field full">
              <label className="label" htmlFor="recovery-token">
                Recovery token
              </label>
              <input
                id="recovery-token"
                type="text"
                autoComplete="one-time-code"
                value={token}
                onChange={(e) => setToken(e.currentTarget.value)}
              />
            </div>
            <div className="field full">
              <label className="label" htmlFor="recovery-password-inline">
                New password
              </label>
              <input
                id="recovery-password-inline"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="field full">
              <label className="label" htmlFor="recovery-confirm-inline">Confirm new password</label>
              <input
                id="recovery-confirm-inline"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {message ? <p className="field full auth-success">{message}</p> : null}
            {error ? <p className="field full auth-error">{error}</p> : null}
            <div className="field full">
              <button className="btn btn-secondary" type="submit" disabled={!canComplete} style={{ width: "100%" }}>
                {pending === "recover" ? "Saving..." : "Complete recovery"}
              </button>
            </div>
          </form>
        ) : null}

        <div className="auth-foot">
          <Link href="/forgot-password">Forgot password only</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
