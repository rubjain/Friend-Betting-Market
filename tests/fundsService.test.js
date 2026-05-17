import assert from "node:assert/strict";
import test from "node:test";
import { normalizePaymentReviewDecision } from "../lib/server/fundsService.js";

test("payment review decisions normalize approve and reject aliases", () => {
  assert.equal(normalizePaymentReviewDecision("approve"), "approve");
  assert.equal(normalizePaymentReviewDecision("APPROVED"), "approve");
  assert.equal(normalizePaymentReviewDecision("reject"), "reject");
  assert.equal(normalizePaymentReviewDecision(" rejected "), "reject");
  assert.equal(normalizePaymentReviewDecision("hold"), "");
});
