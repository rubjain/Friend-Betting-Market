import test from "node:test";
import assert from "node:assert/strict";
import { buildMarketDualPriceSeries, buildMarketYesPriceSeries } from "../lib/marketPriceSeries.js";

test("buildMarketDualPriceSeries ends at current YES and NO and uses game start when linked", () => {
  const now = new Date("2026-05-03T20:00:00.000Z").getTime();
  const market = { id: "m1", yesPrice: 0.52, noPrice: 0.48 };
  const linked = {
    startTime: "2026-05-03T16:00:00.000Z",
    status: "live",
  };
  const s = buildMarketDualPriceSeries(market, linked, now);
  assert.equal(s.points.at(-1).a, 0.52);
  assert.equal(s.points.at(-1).b, 0.48);
  assert.equal(s.windowLabel, "Since game start");
  assert.equal(s.startMs, new Date(linked.startTime).getTime());
});

test("buildMarketDualPriceSeries is deterministic for the same inputs", () => {
  const now = 1_700_000_000_000;
  const market = { id: "stable", yesPrice: 0.44, noPrice: 0.56 };
  const a = buildMarketDualPriceSeries(market, null, now);
  const b = buildMarketDualPriceSeries(market, null, now);
  assert.deepEqual(
    a.points.map((p) => `${p.a},${p.b}`),
    b.points.map((p) => `${p.a},${p.b}`),
  );
});

test("buildMarketYesPriceSeries bridges legacy single-series shape", () => {
  const now = 1_700_000_000_000;
  const market = { id: "legacy", yesPrice: 0.55, noPrice: 0.45 };
  const one = buildMarketYesPriceSeries(market, null, now);
  const dual = buildMarketDualPriceSeries(market, null, now);
  assert.equal(one.points.at(-1).yes, dual.points.at(-1).a);
});
