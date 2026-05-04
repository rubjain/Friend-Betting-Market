"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function verify(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message || "Could not verify email.");
        return;
      }
      setMessage(payload.message || "Email verified.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-head">
          <Link className="brand" href="/">
            <div className="brand-mark">AG</div>
          </Link>
          <h2>Verify email</h2>
          <p>Paste the verification token from your signup flow or open the link from your email.</p>
        </div>
        <form className="form-grid" onSubmit={verify}>
          <div className="field full">
            <label className="label" htmlFor="verify-token">
              Verification token
            </label>
            <input
              id="verify-token"
              type="text"
              autoComplete="one-time-code"
              value={token}
              onChange={(e) => setToken(e.currentTarget.value)}
            />
          </div>
          {message ? <p className="field full auth-success">{message}</p> : null}
          {error ? <p className="field full auth-error">{error}</p> : null}
          <div className="field full">
            <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>
              {pending ? "Verifying..." : "Verify email"}
            </button>
          </div>
        </form>
        <div className="auth-foot">
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
        </div>
      </div>
    </div>
  );
}
