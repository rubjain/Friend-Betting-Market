"use client";

import Link from "next/link";
import { useState } from "react";

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
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      setMessage(payload.message || "If the account exists, recovery can proceed.");
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
    if (pending) return;
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
      setMessage(payload.message || "Account updated.");
      setPassword("");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending("");
    }
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
            Use this flow if you lost access or your account was frozen after risk review. It issues a
            fresh token, sets a new password, clears other sign-in sessions, and unlocks a frozen
            account once the token is used. In production, the token is sent by email only.
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
          <div className="field full">
            <button className="btn btn-primary" type="submit" disabled={!!pending} style={{ width: "100%" }}>
              {pending === "request" ? "Creating token..." : "Request recovery link"}
            </button>
          </div>
        </form>

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
            <label className="label" htmlFor="recovery-password">
              New password
            </label>
            <input
              id="recovery-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          </div>
          {message ? <p className="field full auth-success">{message}</p> : null}
          {error ? <p className="field full auth-error">{error}</p> : null}
          <div className="field full">
            <button className="btn btn-secondary" type="submit" disabled={!!pending} style={{ width: "100%" }}>
              {pending === "recover" ? "Saving..." : "Complete recovery"}
            </button>
          </div>
        </form>

        <div className="auth-foot">
          <Link href="/forgot-password">Forgot password only</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
