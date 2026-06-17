import test from "node:test";
import assert from "node:assert/strict";

import {
  listCreatorPrivateStrategies,
  publicProfile,
  publicSubscription,
  publishMarketplaceProfile,
  updateCreatorMarketplaceProfile,
} from "../lib/server/strategyMarketplaceService.js";
import { createStrategy } from "../lib/server/strategyService.js";

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
  assert.equal(profile.billingPlan, null);
  assert.equal(profile.config, undefined);
  assert.equal(profile.strategy, undefined);
  assert.equal(JSON.stringify(profile).includes("never-return-this"), false);
});

test("publicProfile exposes active billing plan details", () => {
  const profile = publicProfile({
    id: "profile_plan",
    strategyId: "strategy_plan",
    slug: "quant-plan",
    name: "Quant Plan",
    description: "Plan test",
    marketsSupported: ["NFL"],
    riskLevel: "Low",
    priceCents: 2999,
    status: "PUBLISHED",
    roiPct: 1,
    winRatePct: 1,
    maxDrawdownPct: 1,
    subscriberCount: 1,
    copiedVolume: 1,
    billingPlans: [{ id: "plan_1", amountCents: 2999, interval: "MONTH", active: true }],
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
  });
  assert.equal(profile.billingPlan.id, "plan_1");
  assert.equal(profile.billingPlan.amountCents, 2999);
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

test("listCreatorPrivateStrategies links marketplace profiles without exposing config", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    globalThis.__agoraStrategies = [];
    globalThis.__agoraStrategyMarketplaceProfiles = [];

    const created = await createStrategy({
      userId: "user_creator",
      name: "Hidden Alpha",
      mode: "PAPER",
      status: "ACTIVE",
      type: "RULES",
      config: { rules: [{ secret: true }] },
    });
    await publishMarketplaceProfile({
      creatorId: "user_creator",
      strategyId: created.strategy.id,
      profile: {
        name: "Hidden Alpha",
        description: "Public listing",
        marketsSupported: ["NBA"],
        riskLevel: "Medium",
        priceCents: 0,
      },
    });

    const result = await listCreatorPrivateStrategies({ creatorId: "user_creator" });
    assert.equal(result.ok, true);
    assert.equal(result.strategies.length, 1);
    assert.equal(result.strategies[0].id, created.strategy.id);
    assert.equal(result.strategies[0].marketplaceProfile?.status, "PUBLISHED");
    assert.equal(result.strategies[0].config, undefined);
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    delete globalThis.__agoraStrategies;
    delete globalThis.__agoraStrategyMarketplaceProfiles;
  }
});

test("updateCreatorMarketplaceProfile blocks self-publish before approval", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    globalThis.__agoraStrategyMarketplaceProfiles = [{
      id: "profile_review",
      strategyId: "strategy_review",
      creatorId: "user_creator",
      slug: "review-me",
      name: "Review Me",
      description: "Pending",
      marketsSupported: ["NBA"],
      riskLevel: "Medium",
      priceCents: 0,
      status: "UNDER_REVIEW",
      roiPct: 0,
      winRatePct: 0,
      maxDrawdownPct: 0,
      subscriberCount: 0,
      copiedVolume: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];

    const blocked = await updateCreatorMarketplaceProfile({
      creatorId: "user_creator",
      profileId: "profile_review",
      patch: { status: "PUBLISHED" },
    });
    assert.equal(blocked.ok, false);

    globalThis.__agoraStrategyMarketplaceProfiles[0].status = "PAUSED";
    const allowed = await updateCreatorMarketplaceProfile({
      creatorId: "user_creator",
      profileId: "profile_review",
      patch: { status: "PUBLISHED" },
    });
    assert.equal(allowed.ok, true);
    assert.equal(allowed.profile.status, "PUBLISHED");
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    delete globalThis.__agoraStrategyMarketplaceProfiles;
  }
});
