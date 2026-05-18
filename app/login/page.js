"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";

export default function LoginPage() {
  const router = useRouter();
  const { actions } = useFriendMarket();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "session") {
      setSessionNotice("Your session ended. Sign in again to continue.");
    }
  }, []);

  function useDemoAccount(email) {
    setIdentifier(email);
    setPassword("password123");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const ok = await actions.login(identifier, password);
      if (ok) {
        router.push("/");
      } else {
        setError("Invalid email or password.");
      }
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
          <h2>Sign in</h2>
          <p>Use a demo account to test the full user side with $100 and no starting friends.</p>
          {sessionNotice ? (
            <p className="field full auth-note" role="status">
              {sessionNotice}
            </p>
          ) : null}
        </div>
        <div className="demo-login-grid" aria-label="Demo login shortcuts">
          <button type="button" onClick={() => useDemoAccount("admin@example.com")}>
            <strong>Admin</strong>
            <span>admin@example.com</span>
          </button>
          <button type="button" onClick={() => useDemoAccount("test@example.com")}>
            <strong>Test User</strong>
            <span>test@example.com</span>
          </button>
          <button type="button" onClick={() => useDemoAccount("taylor@example.com")}>
            <strong>Taylor Demo</strong>
            <span>taylor@example.com</span>
          </button>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field full">
            <label className="label" htmlFor="login-identifier">
              Email or username
            </label>
            <input
              id="login-identifier"
              type="text"
              autoComplete="username email"
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.currentTarget.value)}
            />
          </div>
          <div className="field full">
            <label className="label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          </div>
          {error ? <p className="field full auth-error">{error}</p> : null}
          <div className="field full" style={{ display: "flex", justifyContent: "flex-end", marginTop: "-8px" }}>
            <Link href="/forgot-password" style={{ fontSize: "13px", color: "#e85d04" }}>Forgot password?</Link>
          </div>
          <div className="field full">
            <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
        <div className="auth-foot">
          <span>Don&apos;t have an account?</span>
          <Link href="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}
