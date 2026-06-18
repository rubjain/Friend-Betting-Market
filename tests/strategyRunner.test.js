import test from "node:test";
import assert from "node:assert/strict";

import { runStrategyOnce } from "../lib/strategies/strategyRunner.js";

test("runStrategyOnce rejects non-ACTIVE strategies", async () => {
  const result = await runStrategyOnce({
    strategy: {
      id: "strat_test",
      mode: "PAPER",
      status: "DRAFT",
      config: { rules: [] },
    },
    userId: "user_1",
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /not ACTIVE/i);
  assert.equal(result.results.length, 0);
});
