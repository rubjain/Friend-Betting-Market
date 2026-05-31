import test from "node:test";
import assert from "node:assert/strict";

import { inferV1ErrorCode } from "../lib/server/v1ErrorCodes.js";

test("inferV1ErrorCode maps common v1 messages to stable codes", () => {
  assert.equal(inferV1ErrorCode("Missing required fields."), "BAD_REQUEST");
  assert.equal(inferV1ErrorCode('Invalid mode. Use "paper" or "real".'), "INVALID_MODE");
  assert.equal(inferV1ErrorCode("Not authenticated."), "UNAUTHORIZED");
  assert.equal(inferV1ErrorCode("Invalid API key."), "INVALID_API_KEY");
  assert.equal(inferV1ErrorCode("API key missing scope trade:paper."), "INVALID_SCOPE");
  assert.equal(inferV1ErrorCode("Strategy not found."), "NOT_FOUND");
  assert.equal(
    inferV1ErrorCode("Strategy is not ACTIVE (current status: DRAFT)."),
    "STRATEGY_NOT_ACTIVE",
  );
  assert.equal(inferV1ErrorCode("Insufficient paper balance for this bet."), "INSUFFICIENT_BALANCE");
});
