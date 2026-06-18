import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  handleComplianceWebhook,
  verifyComplianceWebhook,
} from "../lib/server/complianceProviders.js";

test("verifyComplianceWebhook validates sha256 signatures", () => {
  const rawBody = JSON.stringify({ type: "identity.verified", userId: "user_1" });
  const secret = "test-secret";
  const signature = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const result = verifyComplianceWebhook(
    { provider: "persona", rawBody, signature: `sha256=${signature}` },
    { AGORA_COMPLIANCE_WEBHOOK_SECRET_PERSONA: secret },
  );
  assert.equal(result.ok, true);
});

test("handleComplianceWebhook normalizes location failures", () => {
  const result = handleComplianceWebhook("mock-geo", {
    type: "location.check",
    userId: "user_2",
    decision: "denied",
  });
  assert.equal(result.ok, true);
  assert.equal(result.updates[0].type, "LOCATION");
  assert.equal(result.updates[0].status, "FAILED");
});
