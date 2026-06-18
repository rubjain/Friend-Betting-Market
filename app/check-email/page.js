"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function CheckEmailPage() {
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(index, value) {
    const cleaned = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = cleaned;
    setDigits(next);
    setError("");
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d !== "")) {
      submitCode(next.join(""));
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split("");
      setDigits(next);
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  }

  async function submitCode(code) {
    if (pending || !email) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message || "Invalid code. Try again.");
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  async function resendCode() {
    if (resending || !email) return;
    setResending(true);
    setError("");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setTimeout(() => setResent(false), 4000);
    } finally {
      setResending(false);
    }
  }

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.max(1, b.length)) + c)
    : "your email";

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-head">
          <Link className="brand" href="/">
            <div className="brand-mark">AG</div>
          </Link>
          <h2>Check your email</h2>
          <p>
            We sent a 6-digit code to <strong>{maskedEmail}</strong>.
            Enter it below to activate your account.
          </p>
        </div>

        <div className="form-grid">
          <div className="field full" style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={pending}
                style={{
                  width: "44px",
                  height: "52px",
                  textAlign: "center",
                  fontSize: "22px",
                  fontWeight: "700",
                  fontFamily: "monospace",
                  borderRadius: "8px",
                  border: "1.5px solid #ddd",
                  outline: "none",
                  background: pending ? "#f5f5f5" : "#fff",
                }}
              />
            ))}
          </div>

          {error ? <p className="field full auth-error">{error}</p> : null}
          {resent ? <p className="field full auth-success">New code sent — check your inbox.</p> : null}
          {pending ? <p className="field full" style={{ textAlign: "center", color: "#888" }}>Verifying...</p> : null}

          <div className="field full" style={{ textAlign: "center", marginTop: "8px" }}>
            <p style={{ color: "#888", fontSize: "13px", margin: "0 0 8px" }}>
              Didn&apos;t get it? Check spam or{" "}
              <button
                onClick={resendCode}
                disabled={resending}
                style={{ background: "none", border: "none", color: "#e85d04", cursor: "pointer", fontSize: "13px", padding: 0, fontWeight: "600" }}
              >
                {resending ? "Sending..." : "resend code"}
              </button>
            </p>
            <p style={{ color: "#bbb", fontSize: "12px", margin: 0 }}>
              Wrong account?{" "}
              <Link href="/signup" style={{ color: "#888" }}>Start over</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
