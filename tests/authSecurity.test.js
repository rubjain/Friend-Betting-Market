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
  const previousForceDemo = process.env.AGORA_FORCE_DEMO_MODE;
  process.env.AGORA_FORCE_DEMO_MODE = "1";
  const config = { max: 2, windowMs: 60_000 };
  const identifier = `user-${Date.now()}@example.com`;
  const key = makeRateLimitKey("login", identifier, "test-ip");

  try {
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
  } finally {
    if (previousForceDemo === undefined) {
      delete process.env.AGORA_FORCE_DEMO_MODE;
    } else {
      process.env.AGORA_FORCE_DEMO_MODE = previousForceDemo;
    }
  }
});

import { createEmailVerificationCode } from "../lib/server/auth.js";

test("verification codes are six digits", () => {
  for (let index = 0; index < 20; index += 1) {
    const code = createEmailVerificationCode();
    assert.match(code, /^\d{6}$/);
    assert.equal(Number(code) >= 100000, true);
    assert.equal(Number(code) <= 999999, true);
  }
});

test("auth security exports production rate-limit policies", () => {
  assert.equal(RATE_LIMITS.login.max, 5);
  assert.equal(RATE_LIMITS.signup.max, 3);
  assert.equal(RATE_LIMITS.passwordReset.max, 3);
  assert.equal(RATE_LIMITS.accountRecovery.max, 3);
  assert.equal(RATE_LIMITS.resendVerification.max, 3);
  assert.equal(RATE_LIMITS.emailVerification.max, 10);
  assert.equal(RATE_LIMITS.changePassword.max, 5);
});
