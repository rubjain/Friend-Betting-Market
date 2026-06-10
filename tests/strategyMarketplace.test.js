import test from "node:test";
import assert from "node:assert/strict";

import {
  publicProfile,
  publicSubscription,
} from "../lib/server/strategyMarketplaceService.js";

test("publicProfile omits private strategy config", () => {
  const profile = publicProfile({
    id: "profile_1",
    strategyId: "strategy_1",
    slug: "edge-finder",
    name: "Edge Finder",
    description: "Tracks paper markets.",
    marketsSupported: ["NBA"],
    riskLevel: "Medium",
    priceCents: 500,
    status: "PUBLISHED",
    roiPct: 12.5,
    winRatePct: 55,
    maxDrawdownPct: 8,
    subscriberCount: 4,
    copiedVolume: 120,
    creator: { id: "user_1", name: "Creator", username: "@creator" },
    strategy: {
      id: "strategy_1",
      config: { prompt: "secret", apiKey: "never-return-this" },
    },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  });

  assert.equal(profile.name, "Edge Finder");
  assert.equal(profile.creator.username, "@creator");
  assert.equal(profile.roiPct, 12.5);
  assert.equal(profile.config, undefined);
  assert.equal(profile.strategy, undefined);
  assert.equal(JSON.stringify(profile).includes("never-return-this"), false);
});

test("publicSubscription preserves paper controls without private account data", () => {
  const subscription = publicSubscription({
    id: "sub_1",
    profileId: "profile_1",
    accountMode: "PAPER",
    status: "ACTIVE",
    allocationPct: 15,
    maxTradeSize: 25,
    maxDailyLoss: 50,
    maxOpenPositions: 3,
    allowedMarketIds: ["market_1"],
    autoCopyEnabled: true,
    user: { balanceAccounts: [{ currency: "PAPER", balance: 1000 }] },
    startedAt: new Date("2026-01-01T00:00:00Z"),
  });

  assert.deepEqual(subscription.allowedMarketIds, ["market_1"]);
  assert.equal(subscription.accountMode, "PAPER");
  assert.equal(subscription.allocationPct, 15);
  assert.equal(subscription.user, undefined);
});
