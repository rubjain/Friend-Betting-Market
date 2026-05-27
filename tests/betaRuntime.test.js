import assert from "node:assert/strict";
import test from "node:test";

import {
  betaRuntimeError,
  getBetaLaunchChecks,
  realMoneyDisabledPayload,
  shouldBlockRealMoney,
} from "../lib/server/betaRuntime.js";
import { inferV1ErrorCode } from "../lib/server/v1ErrorCodes.js";

test("public beta checks require persistent production settings", () => {
  const result = getBetaLaunchChecks({
    NODE_ENV: "production",
    AGORA_PUBLIC_BETA: "1",
    AGORA_SESSION_SECRET: "short",
    AGORA_REAL_MONEY_MODE: "0",
    AGORA_DEV_ADMIN_SHORTCUT: "0",
  });

  assert.equal(result.publicBeta, true);
  assert.equal(result.ready, false);
  assert.equal(result.checks.find((check) => check.key === "database").ok, false);
  assert.equal(result.checks.find((check) => check.key === "sessionSecret").ok, false);
  assert.equal(result.checks.find((check) => check.key === "realMoneyDisabled").ok, true);
});

test("public beta checks pass with required hosted env and real money off", () => {
  const result = getBetaLaunchChecks({
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://example",
    DIRECT_URL: "postgresql://example-direct",
    AGORA_SESSION_SECRET: "12345678901234567890123456789012",
    AGORA_APP_URL: "https://agora.example",
    EMAIL_USER: "mailer@example.com",
    EMAIL_PASS: "secret",
    AGORA_REAL_MONEY_MODE: "0",
    AGORA_DEV_ADMIN_SHORTCUT: "0",
  });

  assert.equal(result.ready, true);
});

test("real-money disabled has stable v1 payload and code", () => {
  const payload = realMoneyDisabledPayload();

  assert.equal(shouldBlockRealMoney({ AGORA_REAL_MONEY_MODE: "0" }), true);
  assert.equal(payload.code, "REAL_MONEY_DISABLED");
  assert.equal(inferV1ErrorCode(payload.message), "REAL_MONEY_DISABLED");
});

test("beta runtime database guard is inactive for local development", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPublicBeta = process.env.AGORA_PUBLIC_BETA;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  try {
    process.env.NODE_ENV = "development";
    delete process.env.AGORA_PUBLIC_BETA;
    delete process.env.DATABASE_URL;
    assert.equal(betaRuntimeError(), null);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalPublicBeta === undefined) delete process.env.AGORA_PUBLIC_BETA;
    else process.env.AGORA_PUBLIC_BETA = originalPublicBeta;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});
