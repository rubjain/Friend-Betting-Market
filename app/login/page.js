"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";

export default function LoginPage() {
  const router = useRouter();
  const { actions } = useFriendMarket();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
            <div className="brand-mark">FM</div>
          </Link>
          <h2>Sign in</h2>
          <p>Enter your email and password to continue.</p>
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
          <div className="field full">
            <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>
              {pending ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
        <div className="auth-foot">
          <span>No account?</span>
          <Link href="/signup">Create one</Link>
        </div>
      </div>
    </div>
  );
}
