"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [tokenError, setTokenError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    if (!t) setTokenError(true);
    setToken(t);
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 8;
  const canSubmit = token && password.length >= 8 && password === confirm && !pending;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.message || "Could not reset password. The link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (tokenError) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-head">
            <Link className="brand" href="/"><div className="brand-mark">AG</div></Link>
            <div style={{ fontSize: "40px", margin: "8px 0" }}>⚠️</div>
            <h2>Invalid link</h2>
            <p>This password reset link is missing or invalid. Request a new one.</p>
          </div>
          <div className="auth-foot" style={{ justifyContent: "center" }}>
            <Link href="/forgot-password" className="btn btn-primary" style={{ padding: "10px 24px" }}>
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-head">
            <Link className="brand" href="/"><div className="brand-mark">AG</div></Link>
            <div style={{ fontSize: "40px", margin: "8px 0" }}>✅</div>
            <h2>Password updated</h2>
            <p>Your password has been changed. You can now sign in with your new password.</p>
          </div>
          <div className="auth-foot" style={{ justifyContent: "center" }}>
            <Link href="/login" className="btn btn-primary" style={{ padding: "10px 24px" }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-head">
          <Link className="brand" href="/"><div className="brand-mark">AG</div></Link>
          <h2>Choose a new password</h2>
          <p>Pick something strong that you haven&apos;t used before.</p>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field full">
            <label className="label" htmlFor="rp-password">New password</label>
            <input
              id="rp-password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {weak && (
              <p style={{ color: "#c62828", fontSize: "13px", margin: "4px 0 0" }}>
                Password must be at least 8 characters.
              </p>
            )}
          </div>
          <div className="field full">
            <label className="label" htmlFor="rp-confirm">Confirm new password</label>
            <input
              id="rp-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {mismatch && (
              <p style={{ color: "#c62828", fontSize: "13px", margin: "4px 0 0" }}>
                Passwords do not match.
              </p>
            )}
          </div>
          {error ? <p className="field full auth-error">{error}</p> : null}
          <div className="field full">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!canSubmit}
              style={{ width: "100%" }}
            >
              {pending ? "Updating..." : "Update password"}
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
