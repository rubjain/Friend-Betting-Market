"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (pending || !email.trim()) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.message || "Something went wrong.");
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
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
              We sent a reset link to <strong>{email}</strong>.
              Click it to choose a new password.
            </p>
            <p style={{ color: "#aaa", fontSize: "13px", marginTop: "8px" }}>
              Didn&apos;t get it? Check your spam folder.
            </p>
          </div>
          <div className="auth-foot" style={{ justifyContent: "center" }}>
            <Link href="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-head">
          <Link className="brand" href="/">
            <div className="brand-mark">AG</div>
          </Link>
          <h2>Forgot password?</h2>
          <p>Enter your email and we&apos;ll send you a reset link.</p>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field full">
            <label className="label" htmlFor="fp-email">Email address</label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error ? <p className="field full auth-error">{error}</p> : null}
          <div className="field full">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={pending || !email.trim()}
              style={{ width: "100%" }}
            >
              {pending ? "Sending..." : "Send reset link"}
            </button>
          </div>
        </form>
        <div className="auth-foot">
          <Link href="/login">Back to sign in</Link>
          <Link href="/signup">Create account</Link>
        </div>
      </div>
    </div>
  );
}
