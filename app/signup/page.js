"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";

export default function SignupPage() {
  const router = useRouter();
  const { actions } = useFriendMarket();
  const [draft, setDraft] = useState({ name: "", email: "", username: "", password: "", confirmPassword: "" });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function set(key) {
    return (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    if (draft.password !== draft.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setError("You must accept the Terms of Use and Privacy Policy to create an account.");
      return;
    }
    setError("");
    setPending(true);
    try {
      const result = await actions.signup(draft);
      if (result?.pending) {
        router.push(`/check-email?email=${encodeURIComponent(draft.email)}`);
      } else if (result?.ok) {
        router.push("/");
      } else {
        setError(result?.message || "Could not create account. Check all fields and try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card-wide">
        <div className="auth-head">
          <Link className="brand" href="/">
            <div className="brand-mark">AG</div>
          </Link>
          <h2>Create account</h2>
          <p>Verify your email to activate your account.</p>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field full">
            <label className="label" htmlFor="signup-name">Display name</label>
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
            <label className="label" htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={draft.email}
              onChange={set("email")}
            />
          </div>
          <div className="field full">
            <label className="label" htmlFor="signup-username">Username</label>
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
            <label className="label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={draft.password}
              onChange={set("password")}
            />
          </div>
          <div className="field full">
            <label className="label" htmlFor="signup-confirm-password">Confirm password</label>
            <input
              id="signup-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={draft.confirmPassword}
              onChange={set("confirmPassword")}
            />
            {draft.confirmPassword && draft.password !== draft.confirmPassword && (
              <p style={{ color: "#c62828", fontSize: "13px", margin: "4px 0 0" }}>Passwords do not match.</p>
            )}
          </div>
          {error ? <p className="field full auth-error">{error}</p> : null}
          <div className="field full">
            <label className="auth-terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <Link href="/legal">Terms of Use</Link> and{" "}
                <Link href="/privacy">Privacy Policy</Link>.
              </span>
            </label>
          </div>
          <div className="field full">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={pending || !acceptedTerms || (draft.confirmPassword !== "" && draft.password !== draft.confirmPassword)}
              style={{ width: "100%" }}
            >
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
