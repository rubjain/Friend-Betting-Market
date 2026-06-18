import test from "node:test";
import assert from "node:assert/strict";

import { computeCopyStake } from "../lib/server/copyTradingService.js";
import { MAX_ALLOCATION_PCT } from "../lib/server/strategyMarketplaceService.js";

test("computeCopyStake applies allocation percentage", () => {
  assert.equal(computeCopyStake(100, 10), 10);
  assert.equal(computeCopyStake(50, 25), 12.5);
});

test("computeCopyStake caps stake at max trade size", () => {
  assert.equal(computeCopyStake(100, 50, 20), 20);
  assert.equal(computeCopyStake(100, 10, 20), 10);
});

test("platform allocation cap is 50 percent", () => {
  assert.equal(MAX_ALLOCATION_PCT, 50);
});
