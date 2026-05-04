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

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function requestReset(event) {
    event.preventDefault();
    if (pending) return;
    setPending("request");
    setMessage("");
    setError("");
    try {
      const { response, payload } = await postJson("/api/auth/password-reset", { identifier });
      if (!response.ok) {
        setError(payload.message || "Could not start password reset.");
        return;
      }
      setMessage(payload.message || "If the account exists, a reset link is ready.");
      if (payload.passwordResetToken) {
        setToken(payload.passwordResetToken);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending("");
    }
  }

  async function completeReset(event) {
    event.preventDefault();
    if (pending) return;
    setPending("reset");
    setMessage("");
    setError("");
    try {
      const { response, payload } = await postJson("/api/auth/password-reset", { token, password }, "PATCH");
      if (!response.ok) {
        setError(payload.message || "Could not reset password.");
        return;
      }
      setMessage(payload.message || "Password updated.");
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
          <h2>Reset password</h2>
          <p>Request a reset token, then set a new password. Development responses can show the token for testing.</p>
        </div>

        <form className="form-grid" onSubmit={requestReset}>
          <div className="field full">
            <label className="label" htmlFor="reset-identifier">
              Email or username
            </label>
            <input
              id="reset-identifier"
              type="text"
              autoComplete="username email"
              value={identifier}
              onChange={(e) => setIdentifier(e.currentTarget.value)}
            />
          </div>
          <div className="field full">
            <button className="btn btn-primary" type="submit" disabled={!!pending} style={{ width: "100%" }}>
              {pending === "request" ? "Creating reset..." : "Send reset link"}
            </button>
          </div>
        </form>

        <form className="form-grid" onSubmit={completeReset}>
          <div className="field full">
            <label className="label" htmlFor="reset-token">
              Reset token
            </label>
            <input
              id="reset-token"
              type="text"
              autoComplete="one-time-code"
              value={token}
              onChange={(e) => setToken(e.currentTarget.value)}
            />
          </div>
          <div className="field full">
            <label className="label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
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
              {pending === "reset" ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>

        <div className="auth-foot">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
