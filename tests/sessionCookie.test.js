import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionCookieValue,
  getSessionExpiryState,
  normalizeSession,
  parseSessionCookieValue,
  shouldClearStaleDatabaseSessionCookie,
} from "../lib/server/session.js";

test("shouldClearStaleDatabaseSessionCookie is false for valid authenticated session", () => {
  const cookie = { sessionId: "sess_1", authenticated: true, userId: "u1", role: "user" };
  const resolved = normalizeSession({ authenticated: true, sessionId: "sess_1", userId: "u1" });
  assert.equal(shouldClearStaleDatabaseSessionCookie(true, cookie, resolved), false);
});

test("shouldClearStaleDatabaseSessionCookie is true when DB mode and cookie sessionId no longer valid", () => {
  const cookie = { sessionId: "expired_sess", authenticated: true, userId: "u1", role: "user" };
  const resolved = normalizeSession({
    authenticated: false,
    sessionId: "",
    userId: "user_1",
  });
  assert.equal(shouldClearStaleDatabaseSessionCookie(true, cookie, resolved), true);
});

test("shouldClearStaleDatabaseSessionCookie is false without database", () => {
  const cookie = { sessionId: "x", authenticated: true, userId: "u1", role: "user" };
  const resolved = normalizeSession({ authenticated: false, sessionId: "", userId: "user_1" });
  assert.equal(shouldClearStaleDatabaseSessionCookie(false, cookie, resolved), false);
});

test("session expiry state reports warning window and remaining seconds", () => {
  const now = Date.parse("2026-05-12T12:00:00.000Z");
  const expiresAt = "2026-05-12T12:10:00.000Z";

  const result = getSessionExpiryState(expiresAt, now, 15 * 60 * 1000);

  assert.equal(result.expiresAt, expiresAt);
  assert.equal(result.expiresSoon, true);
  assert.equal(result.secondsUntilExpiry, 600);
});

test("signed session cookies preserve expiry metadata", () => {
  const expiresAt = "2026-05-19T12:00:00.000Z";
  const cookie = createSessionCookieValue({
    authenticated: true,
    role: "admin",
    userId: "admin_1",
    sessionId: "sess_123",
    expiresAt,
  });

  const parsed = parseSessionCookieValue(cookie);

  assert.equal(parsed.authenticated, true);
  assert.equal(parsed.isAdmin, true);
  assert.equal(parsed.sessionId, "sess_123");
  assert.equal(parsed.expiresAt, expiresAt);
});
