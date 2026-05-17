import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluatePaymentCompliance,
  isRealMoneyModeEnabled,
} from "../lib/paymentCompliance.js";

const verifiedUser = {
  frozen: false,
  riskStatus: "clear",
  settings: {
    ageVerificationStatus: "verified",
    sanctionsVerificationStatus: "verified",
  },
  verificationChecks: [
    { type: "EMAIL", status: "VERIFIED" },
    { type: "IDENTITY", status: "VERIFIED" },
    { type: "PAYMENT", status: "VERIFIED" },
    { type: "LOCATION", status: "VERIFIED" },
  ],
};

test("real-money flag controls payment compliance enforcement mode", () => {
  assert.equal(isRealMoneyModeEnabled({ FRIENDMARKET_REAL_MONEY_MODE: "1" }), true);
  assert.equal(isRealMoneyModeEnabled({ FRIENDMARKET_REAL_MONEY_MODE: "0" }), false);
});

test("payment compliance allows demo deposits but records non-enforced warning", () => {
  const result = evaluatePaymentCompliance({
    action: "deposit",
    user: {
      frozen: false,
      riskStatus: "clear",
      verificationChecks: [],
    },
    env: {},
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "demo");
  assert.equal(result.warnings.length, 1);
});

test("payment compliance blocks unverified real-money withdrawals", () => {
  const result = evaluatePaymentCompliance({
    action: "withdrawal",
    user: {
      frozen: false,
      riskStatus: "clear",
      verificationChecks: [{ type: "EMAIL", status: "VERIFIED" }],
    },
    env: { FRIENDMARKET_REAL_MONEY_MODE: "1" },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.requiredChecks, ["email", "age", "identity", "payment", "location", "sanctions"]);
  assert.equal(result.blockingReasons.includes("identity verification is required."), true);
  assert.equal(result.blockingReasons.includes("payment verification is required."), true);
  assert.equal(result.blockingReasons.includes("location verification is required."), true);
  assert.equal(result.blockingReasons.includes("age verification is required."), true);
  assert.equal(result.blockingReasons.includes("sanctions verification is required."), true);
});

test("payment compliance allows verified real-money deposits and withdrawals", () => {
  const env = { FRIENDMARKET_REAL_MONEY_MODE: "1" };

  assert.equal(evaluatePaymentCompliance({ action: "deposit", user: verifiedUser, env }).ok, true);
  assert.equal(evaluatePaymentCompliance({ action: "withdrawal", user: verifiedUser, env }).ok, true);
});

test("payment compliance blocks frozen accounts in demo and real-money modes", () => {
  const result = evaluatePaymentCompliance({
    action: "deposit",
    user: { ...verifiedUser, frozen: true },
    env: {},
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.blockingReasons, ["Account is frozen for manual review."]);
});

test("payment compliance blocks self-excluded accounts before money movement", () => {
  const result = evaluatePaymentCompliance({
    action: "deposit",
    user: {
      ...verifiedUser,
      settings: {
        ...verifiedUser.settings,
        selfExcludedUntil: "2026-05-20T00:00:00.000Z",
      },
    },
    env: { FRIENDMARKET_REAL_MONEY_MODE: "1" },
    now: Date.parse("2026-05-13T00:00:00.000Z"),
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.blockingReasons.includes("Account is self-excluded until the selected cooling-off period ends."),
    true,
  );
});

test("payment compliance enforces real-money responsible deposit limits", () => {
  const result = evaluatePaymentCompliance({
    action: "deposit",
    amount: 250,
    user: {
      ...verifiedUser,
      settings: {
        ...verifiedUser.settings,
        dailyDepositLimit: 100,
      },
    },
    env: { FRIENDMARKET_REAL_MONEY_MODE: "1" },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.blockingReasons.includes("Deposit exceeds the responsible-use limit of $100.00."),
    true,
  );
});
