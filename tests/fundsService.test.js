import assert from "node:assert/strict";
import test from "node:test";
import { normalizePaymentReviewDecision } from "../lib/server/fundsService.js";
import { agoraRealMoneyModeEnabled } from "../lib/server/env.js";

test("stripe funding stays disabled until real-money mode is enabled", () => {
  assert.equal(agoraRealMoneyModeEnabled({ AGORA_REAL_MONEY_MODE: "0" }), false);
  assert.equal(agoraRealMoneyModeEnabled({ AGORA_REAL_MONEY_MODE: "1" }), true);
});

test("payment review decisions normalize approve and reject aliases", () => {
  assert.equal(normalizePaymentReviewDecision("approve"), "approve");
  assert.equal(normalizePaymentReviewDecision("APPROVED"), "approve");
  assert.equal(normalizePaymentReviewDecision("reject"), "reject");
  assert.equal(normalizePaymentReviewDecision(" rejected "), "reject");
  assert.equal(normalizePaymentReviewDecision("hold"), "");
});
