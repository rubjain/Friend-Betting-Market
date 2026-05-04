import assert from "node:assert/strict";
import test from "node:test";
import {
  RATE_LIMITS,
  checkRateLimit,
  clearRateLimit,
  hashPassword,
  makeRateLimitKey,
  recordRateLimitFailure,
  verifyPassword,
} from "../lib/server/authSecurity.js";

test("password hashes verify only the original password", () => {
  const stored = hashPassword("correct horse battery staple");

  assert.equal(verifyPassword("correct horse battery staple", stored), true);
  assert.equal(verifyPassword("wrong horse battery staple", stored), false);
});

test("memory rate limiter blocks after configured failures and can be cleared", async () => {
  const config = { max: 2, windowMs: 60_000 };
  const identifier = `user-${Date.now()}@example.com`;
  const key = makeRateLimitKey("login", identifier, "test-ip");

  const first = await checkRateLimit({ scope: "login", identifier, requestKey: "test-ip", config });
  assert.equal(first.ok, true);

  await recordRateLimitFailure(key, config);
  const second = await checkRateLimit({ scope: "login", identifier, requestKey: "test-ip", config });
  assert.equal(second.ok, true);

  await recordRateLimitFailure(key, config);
  const blocked = await checkRateLimit({ scope: "login", identifier, requestKey: "test-ip", config });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfterSeconds > 0, true);

  await clearRateLimit(key);
  const cleared = await checkRateLimit({ scope: "login", identifier, requestKey: "test-ip", config });
  assert.equal(cleared.ok, true);
});

test("auth security exports production rate-limit policies", () => {
  assert.equal(RATE_LIMITS.login.max, 5);
  assert.equal(RATE_LIMITS.signup.max, 3);
  assert.equal(RATE_LIMITS.passwordReset.max, 3);
});
