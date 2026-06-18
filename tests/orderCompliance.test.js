import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRealMoneyBetEligibility } from "../lib/paymentCompliance.js";
import {
  COMPLIANCE_PROVIDERS,
  isProductionComplianceReady,
  stripeReconciliationNotes,
} from "../lib/server/complianceProviders.js";

const verifiedUser = {
  frozen: false,
  riskStatus: "clear",
  verificationChecks: [
    { type: "EMAIL", status: "VERIFIED" },
    { type: "IDENTITY", status: "VERIFIED" },
    { type: "PAYMENT", status: "VERIFIED" },
    { type: "LOCATION", status: "VERIFIED" },
    { type: "AGE", status: "VERIFIED" },
    { type: "SANCTIONS", status: "VERIFIED" },
  ],
};

test("real-money bet eligibility requires all verification checks", () => {
  const blocked = evaluateRealMoneyBetEligibility({
    user: { ...verifiedUser, verificationChecks: [{ type: "EMAIL", status: "VERIFIED" }] },
    env: { AGORA_REAL_MONEY_MODE: "1" },
  });
  assert.equal(blocked.ok, false);

  const allowed = evaluateRealMoneyBetEligibility({
    user: verifiedUser,
    env: { AGORA_REAL_MONEY_MODE: "1" },
  });
  assert.equal(allowed.ok, true);
});

test("compliance provider defaults stay in beta mode", () => {
  assert.equal(COMPLIANCE_PROVIDERS.kyc, "self-service-beta");
  assert.equal(isProductionComplianceReady({ AGORA_REAL_MONEY_MODE: "1" }), false);
  assert.equal(stripeReconciliationNotes().length >= 1, true);
});
