import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSession,
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
