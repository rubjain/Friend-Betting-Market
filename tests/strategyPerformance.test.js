import test from "node:test";
import assert from "node:assert/strict";

import { betPnl, summarizeBets } from "../lib/server/strategyPerformanceService.js";

test("betPnl calculates won, lost, and sold outcomes", () => {
  assert.equal(betPnl({ stake: 10, status: "WON", expectedMultiplier: 2 }), 10);
  assert.equal(betPnl({ stake: 10, status: "LOST", expectedMultiplier: 2 }), -10);
  assert.equal(betPnl({ stake: 10, status: "SOLD", expectedMultiplier: 0.8 }), -2);
});

test("summarizeBets computes roi, win rate, and drawdown", () => {
  const summary = summarizeBets([
    { stake: 10, status: "WON", expectedMultiplier: 2, placedAt: "2026-01-01T00:00:00Z", settledAt: "2026-01-02T00:00:00Z" },
    { stake: 10, status: "LOST", expectedMultiplier: 2, placedAt: "2026-01-03T00:00:00Z", settledAt: "2026-01-04T00:00:00Z" },
  ]);

  assert.equal(summary.winRatePct, 50);
  assert.equal(summary.roiPct, 0);
  assert.ok(summary.maxDrawdownPct >= 0);
});
