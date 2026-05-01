"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";

export default function SignupPage() {
  const router = useRouter();
  const { actions } = useFriendMarket();
  const [draft, setDraft] = useState({ name: "", email: "", username: "", password: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function set(key) {
    return (e) => setDraft((d) => ({ ...d, [key]: e.currentTarget.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    try {
      const ok = await actions.signup(draft);
      if (ok) {
        router.push("/");
      } else {
        setError("Could not create account. Check all fields and try again.");
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
          <h2>Create account</h2>
          <p>Demo mode uses test accounts. Use the sign-in page to enter the basic user sandbox.</p>
        </div>
        <div className="note-banner auth-note">
          Use test@example.com or taylor@example.com with password123 to test friend invites from clean $100 accounts.
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field full">
            <label className="label" htmlFor="signup-name">
              Display name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              autoFocus
              value={draft.name}
              onChange={set("name")}
            />
          </div>
          <div className="field full">
            <label className="label" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={draft.email}
              onChange={set("email")}
            />
          </div>
          <div className="field full">
            <label className="label" htmlFor="signup-username">
              Username
            </label>
            <input
              id="signup-username"
              type="text"
              autoComplete="username"
              placeholder="@username"
              value={draft.username}
              onChange={set("username")}
            />
          </div>
          <div className="field full">
            <label className="label" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={draft.password}
              onChange={set("password")}
            />
          </div>
          {error ? <p className="field full auth-error">{error}</p> : null}
          <div className="field full">
            <button className="btn btn-primary" type="submit" disabled={pending} style={{ width: "100%" }}>
              {pending ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
        <div className="auth-foot">
          <span>Already have an account?</span>
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
