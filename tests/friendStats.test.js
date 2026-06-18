import assert from "node:assert/strict";
import test from "node:test";
import { getHeadToHeadStats } from "../lib/friendStats.js";

const market = { title: "Will the Knicks beat the Celtics?" };

test("head-to-head stats keep open overlaps out of settled pushes", () => {
  const stats = getHeadToHeadStats(
    [
      {
        marketId: "market_1",
        side: "YES",
        status: "OPEN",
        stake: 12,
        expectedMultiplier: 2,
        placedAt: "2026-05-17T12:00:00Z",
        market,
      },
    ],
    [{ marketId: "market_1", side: "NO", status: "OPEN" }],
  );

  assert.deepEqual(stats.record, { wins: 0, losses: 0, pushes: 0, open: 1 });
  assert.equal(stats.summary.open, 1);
  assert.equal(stats.summary.stakeAtRisk, 12);
  assert.equal(stats.summary.winRate, 0);
  assert.equal(stats.recentMatchups[0].myBadge, "O");
});

test("head-to-head stats calculate settled record win rate and net", () => {
  const stats = getHeadToHeadStats(
    [
      {
        marketId: "market_1",
        side: "YES",
        status: "WON",
        stake: 10,
        expectedMultiplier: 2.4,
        placedAt: "2026-05-17T12:00:00Z",
        market,
      },
      {
        marketId: "market_2",
        side: "NO",
        status: "LOST",
        stake: 6,
        expectedMultiplier: 1.8,
        placedAt: "2026-05-16T12:00:00Z",
        market: { title: "Will the Lakers cover?" },
      },
      {
        marketId: "market_3",
        side: "YES",
        status: "VOIDED",
        stake: 5,
        expectedMultiplier: 2,
        placedAt: "2026-05-15T12:00:00Z",
        market: { title: "Will rain delay first pitch?" },
      },
    ],
    [
      { marketId: "market_1", side: "NO", status: "LOST" },
      { marketId: "market_2", side: "YES", status: "WON" },
      { marketId: "market_3", side: "NO", status: "VOIDED" },
    ],
  );

  assert.deepEqual(stats.record, { wins: 1, losses: 1, pushes: 1, open: 0 });
  assert.equal(stats.summary.settled, 2);
  assert.equal(stats.summary.winRate, 50);
  assert.equal(stats.netAmount, 8);
  assert.deepEqual(stats.recentMatchups.map((matchup) => matchup.myBadge), ["W", "L", "P"]);
});
