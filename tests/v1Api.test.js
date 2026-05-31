import test from "node:test";
import assert from "node:assert/strict";

import { requireApiKeyScopes, resolvePublicApiCaller } from "../lib/server/auth.js";
import { evaluateRealMoneyBetEligibility } from "../lib/paymentCompliance.js";

test("resolvePublicApiCaller returns 401 without session or key", async () => {
  const result = await resolvePublicApiCaller(new Request("http://localhost/api/v1/portfolio"));
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 401);
});

test("requireApiKeyScopes allows session callers and blocks missing scope", async () => {
  const sessionCaller = requireApiKeyScopes(null, "trade:paper");
  assert.equal(sessionCaller.ok, true);

  const missingScope = requireApiKeyScopes(["read:markets"], "trade:paper");
  assert.equal(missingScope.ok, false);
  assert.equal(missingScope.response.status, 403);
  const body = await missingScope.response.json();
  assert.equal(body.code, "INVALID_SCOPE");
});

test("real-money trade eligibility enforces verification checks only in real-money mode", async () => {
  const user = {
    frozen: false,
    settings: {},
    verificationChecks: [
      { type: "EMAIL", status: "VERIFIED" },
      { type: "AGE", status: "VERIFIED" },
      { type: "PAYMENT", status: "VERIFIED" },
      { type: "LOCATION", status: "VERIFIED" },
      { type: "SANCTIONS", status: "VERIFIED" },
      { type: "IDENTITY", status: "VERIFIED" },
    ],
  };

  const demoResult = evaluateRealMoneyBetEligibility({
    user,
    env: { AGORA_REAL_MONEY_MODE: "0" },
  });
  assert.equal(demoResult.ok, true);

  const realResult = evaluateRealMoneyBetEligibility({
    user,
    env: { AGORA_REAL_MONEY_MODE: "1" },
  });
  assert.equal(realResult.ok, true);
});

