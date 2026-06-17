import crypto from "node:crypto";
import { hasDatabaseUrl, prisma } from "./prisma.js";
import { listStrategies } from "./strategyService.js";
import { computeProfilePerformance } from "./strategyPerformanceService.js";
import { agoraStrategyMarketplaceEnabled, agoraStrategyMaxAllocationPct } from "./env.js";
import {
  createInvoice,
  getOrCreateMarketplacePlan,
  listSubscriptionInvoices,
  upsertBillingSubscription,
} from "./marketplaceBillingService.js";
import {
  grantEntitlement,
  hasMarketplaceEntitlement,
  listEntitlementsForUser,
  revokeEntitlements,
} from "./marketplaceEntitlementService.js";
import { listModerationQueue, recordModerationEvent } from "./marketplaceModerationService.js";
import { appendCreatorRevenueEvent, summarizeCreatorRevenue } from "./creatorPayoutService.js";

function nowIso() {
  return new Date().toISOString();
}

function toNumber(value) {
  return Number(value ?? 0);
}

function slugify(value) {
  const base = String(value || "strategy")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "strategy";
}

function demoProfiles() {
  if (!globalThis.__agoraStrategyMarketplaceProfiles) {
    globalThis.__agoraStrategyMarketplaceProfiles = [];
  }
  return globalThis.__agoraStrategyMarketplaceProfiles;
}

function demoSubscriptions() {
  if (!globalThis.__agoraStrategySubscriptions) {
    globalThis.__agoraStrategySubscriptions = [];
  }
  return globalThis.__agoraStrategySubscriptions;
}

function publicProfile(profile, subscription = null) {
  if (!profile) return null;
  const creator = profile.creator || profile.strategy?.user || null;
  return {
    id: profile.id,
    strategyId: profile.strategyId,
    slug: profile.slug,
    name: profile.name,
    description: profile.description,
    creator: creator ? { id: creator.id, name: creator.name, username: creator.username } : null,
    marketsSupported: profile.marketsSupported || [],
    riskLevel: profile.riskLevel,
    priceCents: profile.priceCents ?? 0,
    status: profile.status,
    roiPct: toNumber(profile.roiPct),
    winRatePct: toNumber(profile.winRatePct),
    maxDrawdownPct: toNumber(profile.maxDrawdownPct),
    subscriberCount: profile.subscriberCount ?? 0,
    copiedVolume: toNumber(profile.copiedVolume),
    billingPlan: profile.billingPlans?.[0]
      ? {
          id: profile.billingPlans[0].id,
          amountCents: profile.billingPlans[0].amountCents,
          interval: profile.billingPlans[0].interval,
          active: profile.billingPlans[0].active,
        }
      : null,
    createdAt: profile.createdAt?.toISOString?.() ?? profile.createdAt,
    updatedAt: profile.updatedAt?.toISOString?.() ?? profile.updatedAt,
    subscription: subscription ? publicSubscription(subscription) : null,
  };
}

function publicSubscription(subscription) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    profileId: subscription.profileId,
    accountMode: subscription.accountMode,
    status: subscription.status,
    allocationPct: toNumber(subscription.allocationPct),
    maxTradeSize: subscription.maxTradeSize == null ? null : toNumber(subscription.maxTradeSize),
    maxDailyLoss: subscription.maxDailyLoss == null ? null : toNumber(subscription.maxDailyLoss),
    maxOpenPositions: subscription.maxOpenPositions,
    allowedMarketIds: subscription.allowedMarketIds || [],
    autoCopyEnabled: Boolean(subscription.autoCopyEnabled),
    startedAt: subscription.startedAt?.toISOString?.() ?? subscription.startedAt,
    canceledAt: subscription.canceledAt?.toISOString?.() ?? subscription.canceledAt,
  };
}

function sanitizeProfileInput(input = {}) {
  return {
    name: String(input.name || "Untitled strategy").trim().slice(0, 80),
    description: String(input.description || "").trim().slice(0, 1200),
    marketsSupported: Array.isArray(input.marketsSupported)
      ? input.marketsSupported.map((item) => String(item).trim()).filter(Boolean).slice(0, 12)
      : [],
    riskLevel: String(input.riskLevel || "Medium").trim().slice(0, 32),
    priceCents: Math.max(0, Math.round(Number(input.priceCents) || 0)),
  };
}

const MAX_ALLOCATION_PCT = agoraStrategyMaxAllocationPct();

function sanitizeSubscriptionInput(input = {}) {
  const allocationPct = Math.min(MAX_ALLOCATION_PCT, Math.max(0, Number(input.allocationPct ?? 10)));
  const maxTradeSize = input.maxTradeSize === "" || input.maxTradeSize == null ? null : Math.max(0, Number(input.maxTradeSize) || 0);
  const maxDailyLoss = input.maxDailyLoss === "" || input.maxDailyLoss == null ? null : Math.max(0, Number(input.maxDailyLoss) || 0);
  const maxOpenPositions = input.maxOpenPositions === "" || input.maxOpenPositions == null
    ? null
    : Math.max(0, Math.floor(Number(input.maxOpenPositions) || 0));
  return {
    accountMode: String(input.accountMode || "PAPER").toUpperCase() === "REAL" ? "REAL" : "PAPER",
    allocationPct,
    maxTradeSize,
    maxDailyLoss,
    maxOpenPositions,
    allowedMarketIds: Array.isArray(input.allowedMarketIds)
      ? input.allowedMarketIds.map((item) => String(item)).filter(Boolean).slice(0, 50)
      : [],
    autoCopyEnabled: input.autoCopyEnabled !== false,
    status: String(input.status || "ACTIVE").toUpperCase() === "PAUSED" ? "PAUSED" : "ACTIVE",
  };
}

async function recomputeProfileStats(profileId, client = prisma) {
  if (!hasDatabaseUrl()) return null;

  const [copied, activeSubs] = await Promise.all([
    client.copyTrade.findMany({
      where: { subscription: { profileId }, status: "COPIED", accountMode: "PAPER" },
      include: { subscription: true },
    }),
    client.strategySubscription.count({ where: { profileId, status: "ACTIVE", accountMode: "PAPER" } }),
  ]);

  const copiedVolume = copied.reduce((sum, item) => sum + toNumber(item.stake), 0);
  const performance = await computeProfilePerformance(profileId, { client });
  await client.strategyMarketplaceProfile.update({
    where: { id: profileId },
    data: {
      subscriberCount: activeSubs,
      copiedVolume,
      roiPct: performance.roiPct,
      winRatePct: performance.winRatePct,
      maxDrawdownPct: performance.maxDrawdownPct,
    },
  }).catch(() => null);
}

export async function listMarketplaceProfiles({ userId } = {}) {
  if (!agoraStrategyMarketplaceEnabled()) return [];
  if (!hasDatabaseUrl()) {
    const subscriptions = demoSubscriptions();
    return demoProfiles()
      .filter((profile) => profile.status === "PUBLISHED")
      .map((profile) => publicProfile(profile, subscriptions.find((sub) => sub.profileId === profile.id && sub.userId === userId && sub.accountMode === "PAPER")));
  }

  const profiles = await prisma.strategyMarketplaceProfile.findMany({
    where: { status: "PUBLISHED" },
    include: {
      creator: { select: { id: true, name: true, username: true } },
      subscriptions: userId ? { where: { userId, accountMode: "PAPER" }, take: 1 } : false,
      billingPlans: { where: { active: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
    orderBy: [{ subscriberCount: "desc" }, { updatedAt: "desc" }],
  });
  return profiles.map((profile) => publicProfile(profile, profile.subscriptions?.[0] || null));
}

export async function getMarketplaceProfile({ profileId, userId }) {
  if (!hasDatabaseUrl()) {
    const profile = demoProfiles().find((item) => item.id === profileId || item.slug === profileId);
    if (!profile || profile.status === "ARCHIVED") return null;
    const sub = demoSubscriptions().find((item) => item.profileId === profile.id && item.userId === userId && item.accountMode === "PAPER");
    return publicProfile(profile, sub);
  }

  const profile = await prisma.strategyMarketplaceProfile.findFirst({
    where: { OR: [{ id: profileId }, { slug: profileId }], status: { not: "ARCHIVED" } },
    include: {
      creator: { select: { id: true, name: true, username: true } },
      subscriptions: userId ? { where: { userId, accountMode: "PAPER" }, take: 1 } : false,
      billingPlans: { where: { active: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  return publicProfile(profile, profile?.subscriptions?.[0] || null);
}

function publicPrivateStrategy(strategy, marketplaceProfile = null) {
  if (!strategy) return null;
  return {
    id: strategy.id,
    name: strategy.name,
    mode: strategy.mode,
    type: strategy.type,
    status: strategy.status,
    createdAt: strategy.createdAt?.toISOString?.() ?? strategy.createdAt,
    updatedAt: strategy.updatedAt?.toISOString?.() ?? strategy.updatedAt,
    marketplaceProfile: marketplaceProfile
      ? { id: marketplaceProfile.id, status: marketplaceProfile.status, slug: marketplaceProfile.slug }
      : null,
  };
}

export async function listCreatorPrivateStrategies({ creatorId }) {
  const strategies = await listStrategies(creatorId);
  if (!hasDatabaseUrl()) {
    const profiles = demoProfiles().filter((profile) => profile.creatorId === creatorId);
    const profileByStrategy = new Map(profiles.map((profile) => [profile.strategyId, profile]));
    return {
      ok: true,
      strategies: strategies.map((strategy) => publicPrivateStrategy(strategy, profileByStrategy.get(strategy.id))),
    };
  }

  const profiles = await prisma.strategyMarketplaceProfile.findMany({
    where: { creatorId },
    select: { id: true, strategyId: true, status: true, slug: true },
  });
  const profileByStrategy = new Map(profiles.map((profile) => [profile.strategyId, profile]));
  return {
    ok: true,
    strategies: strategies.map((strategy) => publicPrivateStrategy(strategy, profileByStrategy.get(strategy.id))),
  };
}

export async function listCreatorMarketplaceProfiles({ creatorId }) {
  if (!hasDatabaseUrl()) {
    const profiles = demoProfiles().filter((profile) => profile.creatorId === creatorId);
    return { ok: true, profiles: profiles.map((profile) => publicProfile(profile)), revenueCents: 0 };
  }

  const profiles = await prisma.strategyMarketplaceProfile.findMany({
    where: { creatorId },
    include: {
      strategy: { select: { id: true, name: true, mode: true, status: true } },
      subscriptions: { select: { id: true, status: true, accountMode: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const normalized = profiles.map((profile) => {
    const activeCount = profile.subscriptions.filter((sub) => sub.status === "ACTIVE" && sub.accountMode === "PAPER").length;
    return {
      ...publicProfile(profile),
      strategy: profile.strategy,
      activeSubscriberCount: activeCount,
      pausedSubscriberCount: profile.subscriptions.filter((sub) => sub.status === "PAUSED").length,
      estimatedRevenueCents: activeCount * (profile.priceCents ?? 0),
    };
  });
  return {
    ok: true,
    profiles: normalized,
    revenueCents: normalized.reduce((sum, profile) => sum + profile.estimatedRevenueCents, 0),
  };
}

export async function publishMarketplaceProfile({ creatorId, strategyId, profile }) {
  const data = sanitizeProfileInput(profile);
  if (!data.description) return { ok: false, message: "Add a strategy description before publishing." };

  if (!hasDatabaseUrl()) {
    const created = {
      id: `profile_${crypto.randomBytes(8).toString("hex")}`,
      strategyId,
      creatorId,
      slug: `${slugify(data.name)}-${crypto.randomBytes(3).toString("hex")}`,
      ...data,
      status: "PUBLISHED",
      roiPct: 0,
      winRatePct: 0,
      maxDrawdownPct: 0,
      subscriberCount: 0,
      copiedVolume: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    demoProfiles().unshift(created);
    return { ok: true, profile: publicProfile(created) };
  }

  const strategy = await prisma.strategy.findFirst({ where: { id: strategyId, userId: creatorId } });
  if (!strategy) return { ok: false, message: "Strategy not found." };
  if (strategy.mode !== "PAPER") return { ok: false, message: "Only paper strategies can be published in the MVP." };

  const existing = await prisma.strategyMarketplaceProfile.findUnique({ where: { strategyId } });
  const slug = existing?.slug || `${slugify(data.name)}-${crypto.randomBytes(3).toString("hex")}`;
  const saved = await prisma.strategyMarketplaceProfile.upsert({
    where: { strategyId },
    create: { strategyId, creatorId, slug, status: "UNDER_REVIEW", ...data },
    update: { status: "UNDER_REVIEW", ...data },
    include: {
      creator: { select: { id: true, name: true, username: true } },
      billingPlans: { where: { active: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  await getOrCreateMarketplacePlan({
    profileId: saved.id,
    amountCents: data.priceCents,
    interval: "MONTH",
    name: `${data.name} Monthly`,
  });
  await recordModerationEvent({
    profileId: saved.id,
    actorId: creatorId,
    action: "SUBMITTED",
    reason: "Creator submitted profile for review.",
  }).catch(() => {});
  await prisma.auditTrail.create({
    data: { actorId: creatorId, action: "strategy.marketplace.published", metadata: { strategyId, profileId: saved.id } },
  }).catch(() => {});
  return { ok: true, profile: publicProfile(saved) };
}

function canCreatorSetProfileStatus(currentStatus, nextStatus) {
  if (!nextStatus || nextStatus === currentStatus) return true;
  if (nextStatus === "ARCHIVED") return true;
  if (nextStatus === "PAUSED") return currentStatus === "PUBLISHED";
  if (nextStatus === "PUBLISHED") return currentStatus === "PAUSED" || currentStatus === "PUBLISHED";
  return false;
}

export async function updateCreatorMarketplaceProfile({ creatorId, profileId, patch }) {
  const data = sanitizeProfileInput(patch);
  const status = patch.status ? String(patch.status).toUpperCase() : undefined;
  const allowedStatus = ["DRAFT", "PUBLISHED", "PAUSED", "ARCHIVED"].includes(status) ? status : undefined;

  if (!hasDatabaseUrl()) {
    const store = demoProfiles();
    const idx = store.findIndex((profile) => profile.id === profileId && profile.creatorId === creatorId);
    if (idx < 0) return { ok: false, message: "Marketplace profile not found." };
    if (allowedStatus && !canCreatorSetProfileStatus(store[idx].status, allowedStatus)) {
      return {
        ok: false,
        message: allowedStatus === "PUBLISHED"
          ? "This listing is not approved yet. Wait for admin review or resubmit from the publish form."
          : "That status change is not allowed.",
      };
    }
    store[idx] = { ...store[idx], ...data, ...(allowedStatus ? { status: allowedStatus } : {}), updatedAt: nowIso() };
    return { ok: true, profile: publicProfile(store[idx]) };
  }

  const current = await prisma.strategyMarketplaceProfile.findFirst({
    where: { id: profileId, creatorId },
    select: { status: true },
  });
  if (!current) return { ok: false, message: "Marketplace profile not found." };
  if (allowedStatus && !canCreatorSetProfileStatus(current.status, allowedStatus)) {
    return {
      ok: false,
      message: allowedStatus === "PUBLISHED"
        ? "This listing is not approved yet. Wait for admin review or resubmit from the publish form."
        : "That status change is not allowed.",
    };
  }

  const updated = await prisma.strategyMarketplaceProfile.updateMany({
    where: { id: profileId, creatorId },
    data: { ...data, ...(allowedStatus ? { status: allowedStatus } : {}) },
  });
  if (!updated.count) return { ok: false, message: "Marketplace profile not found." };
  const profile = await prisma.strategyMarketplaceProfile.findUnique({
    where: { id: profileId },
    include: { creator: { select: { id: true, name: true, username: true } } },
  });
  await prisma.auditTrail.create({
    data: { actorId: creatorId, action: "strategy.marketplace.updated", metadata: { profileId, status: allowedStatus } },
  }).catch(() => {});
  return { ok: true, profile: publicProfile(profile) };
}

export async function upsertStrategySubscription({ userId, profileId, input }) {
  if (!agoraStrategyMarketplaceEnabled()) {
    return { ok: false, message: "Strategy marketplace is currently disabled." };
  }
  const data = sanitizeSubscriptionInput(input);
  if (data.accountMode !== "PAPER") {
    return { ok: false, message: "Real-money copy trading is disabled for the MVP." };
  }
  if (data.allocationPct <= 0) return { ok: false, message: "Allocation must be greater than 0%." };

  if (!hasDatabaseUrl()) {
    const store = demoSubscriptions();
    const idx = store.findIndex((sub) => sub.profileId === profileId && sub.userId === userId && sub.accountMode === data.accountMode);
    const record = {
      id: idx >= 0 ? store[idx].id : `sub_${crypto.randomBytes(8).toString("hex")}`,
      profileId,
      userId,
      ...data,
      startedAt: idx >= 0 ? store[idx].startedAt : nowIso(),
      canceledAt: null,
      createdAt: idx >= 0 ? store[idx].createdAt : nowIso(),
      updatedAt: nowIso(),
    };
    if (idx >= 0) store[idx] = record; else store.unshift(record);
    return { ok: true, subscription: publicSubscription(record) };
  }

  const profile = await prisma.strategyMarketplaceProfile.findUnique({ where: { id: profileId } });
  if (!profile || profile.status !== "PUBLISHED") return { ok: false, message: "Strategy is not available for subscription." };

  const subscription = await prisma.strategySubscription.upsert({
    where: { profileId_userId_accountMode: { profileId, userId, accountMode: "PAPER" } },
    create: { profileId, userId, accountMode: "PAPER", ...data },
    update: { ...data, canceledAt: null },
  });
  await recomputeProfileStats(profileId);
  const plan = await getOrCreateMarketplacePlan({
    profileId,
    amountCents: profile.priceCents ?? 0,
    interval: "MONTH",
    name: `${profile.name} Monthly`,
  });
  if (plan.ok && plan.plan) {
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const billing = await upsertBillingSubscription({
      userId,
      profileId,
      planId: plan.plan.id,
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      metadata: { source: "strategy-subscribe-api" },
    });
    await createInvoice({
      userId,
      profileId,
      billingSubscriptionId: billing.subscription.id,
      amountDueCents: plan.plan.amountCents,
      amountPaidCents: plan.plan.amountCents,
      status: "PAID",
      paidAt: new Date(),
      metadata: { source: "subscription-upsert" },
    });
    await grantEntitlement({
      userId,
      profileId,
      billingSubscriptionId: billing.subscription.id,
      startsAt: periodStart,
      endsAt: periodEnd,
      status: "ACTIVE",
      source: "billing",
      reason: "Initial subscription activation",
    });
  }
  await prisma.auditTrail.create({
    data: { actorId: userId, action: "strategy.subscription.upserted", metadata: { profileId, subscriptionId: subscription.id } },
  }).catch(() => {});
  return { ok: true, subscription: publicSubscription(subscription) };
}

export async function updateStrategySubscription({ userId, profileId, input }) {
  return upsertStrategySubscription({ userId, profileId, input });
}

export async function cancelStrategySubscription({ userId, profileId }) {
  if (!hasDatabaseUrl()) {
    const sub = demoSubscriptions().find((item) => item.profileId === profileId && item.userId === userId && item.accountMode === "PAPER");
    if (!sub) return { ok: false, message: "Subscription not found." };
    sub.status = "CANCELED";
    sub.autoCopyEnabled = false;
    sub.canceledAt = nowIso();
    return { ok: true, subscription: publicSubscription(sub) };
  }

  const subscription = await prisma.strategySubscription.findUnique({
    where: { profileId_userId_accountMode: { profileId, userId, accountMode: "PAPER" } },
  });
  if (!subscription) return { ok: false, message: "Subscription not found." };
  const updated = await prisma.strategySubscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELED", autoCopyEnabled: false, canceledAt: new Date() },
  });
  await recomputeProfileStats(profileId);
  await upsertBillingSubscription({
    userId,
    profileId,
    planId: (
      await getOrCreateMarketplacePlan({ profileId, amountCents: 0, interval: "MONTH", name: "Fallback plan" })
    ).plan.id,
    status: "CANCELED",
    metadata: { source: "subscription-cancel" },
  }).catch(() => {});
  await revokeEntitlements({
    userId,
    profileId,
    reason: "Subscription canceled",
  }).catch(() => {});
  await prisma.auditTrail.create({
    data: { actorId: userId, action: "strategy.subscription.canceled", metadata: { profileId, subscriptionId: updated.id } },
  }).catch(() => {});
  return { ok: true, subscription: publicSubscription(updated) };
}

export async function listUserStrategySubscriptions({ userId }) {
  if (!hasDatabaseUrl()) {
    const subs = demoSubscriptions().filter((sub) => sub.userId === userId && sub.accountMode === "PAPER" && sub.status !== "CANCELED");
    return subs.map((sub) => {
      const profile = demoProfiles().find((item) => item.id === sub.profileId);
      return { subscription: publicSubscription(sub), profile: publicProfile(profile) };
    });
  }

  const subscriptions = await prisma.strategySubscription.findMany({
    where: { userId, accountMode: "PAPER", status: { not: "CANCELED" } },
    include: {
      profile: { include: { creator: { select: { id: true, name: true, username: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return subscriptions.map((sub) => ({
    subscription: publicSubscription(sub),
    profile: publicProfile(sub.profile),
  }));
}

export async function getSubscriptionBillingSummary({ userId, profileId }) {
  if (!hasDatabaseUrl()) {
    return { ok: true, invoices: [], entitlements: [], hasEntitlement: true };
  }
  const invoices = await listSubscriptionInvoices({ userId, profileId });
  const entitlements = (await listEntitlementsForUser({ userId }))
    .filter((entry) => entry.profileId === profileId)
    .map((entry) => ({
      id: entry.id,
      status: entry.status,
      startsAt: entry.startsAt?.toISOString?.() || null,
      endsAt: entry.endsAt?.toISOString?.() || null,
      graceEndsAt: entry.graceEndsAt?.toISOString?.() || null,
      reason: entry.reason || null,
    }));
  return {
    ok: true,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      status: invoice.status,
      amountDueCents: invoice.amountDueCents,
      amountPaidCents: invoice.amountPaidCents,
      createdAt: invoice.createdAt?.toISOString?.() || null,
      paidAt: invoice.paidAt?.toISOString?.() || null,
      failureMessage: invoice.failureMessage || null,
    })),
    entitlements,
    hasEntitlement: await hasMarketplaceEntitlement({ userId, profileId }),
  };
}

export async function listProfileCopyTrades({ userId, profileId, limit = 50 }) {
  if (!hasDatabaseUrl()) return [];

  const subscription = await prisma.strategySubscription.findUnique({
    where: { profileId_userId_accountMode: { profileId, userId, accountMode: "PAPER" } },
  });
  if (!subscription) return [];

  const trades = await prisma.copyTrade.findMany({
    where: { subscriptionId: subscription.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(100, Math.max(1, limit)),
    include: {
      signal: { select: { marketId: true, side: true, sourceStake: true, createdAt: true } },
    },
  });

  const betIds = trades.map((trade) => trade.copiedBetId).filter(Boolean);
  const markets = betIds.length
    ? await prisma.bet.findMany({
      where: { id: { in: betIds } },
      select: { id: true, marketId: true, status: true },
    })
    : [];
  const betById = new Map(markets.map((bet) => [bet.id, bet]));

  return trades.map((trade) => ({
    id: trade.id,
    status: trade.status,
    skipReason: trade.skipReason,
    stake: toNumber(trade.stake),
    marketId: trade.signal?.marketId || betById.get(trade.copiedBetId)?.marketId || null,
    side: trade.signal?.side || null,
    sourceStake: toNumber(trade.signal?.sourceStake),
    copiedBetId: trade.copiedBetId,
    betStatus: betById.get(trade.copiedBetId)?.status || null,
    createdAt: trade.createdAt.toISOString(),
  }));
}

export async function getCreatorProfileAnalytics({ creatorId, profileId }) {
  if (!hasDatabaseUrl()) {
    return { ok: true, copiesByDay: [], skipReasons: {}, estimatedRevenueCents: 0 };
  }

  const profile = await prisma.strategyMarketplaceProfile.findFirst({
    where: { id: profileId, creatorId },
    include: { subscriptions: { where: { accountMode: "PAPER" } } },
  });
  if (!profile) return { ok: false, message: "Marketplace profile not found." };

  const copies = await prisma.copyTrade.findMany({
    where: { signal: { profileId } },
    select: { status: true, skipReason: true, stake: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const copiesByDay = {};
  const skipReasons = {};
  for (const copy of copies) {
    const day = copy.createdAt.toISOString().slice(0, 10);
    if (!copiesByDay[day]) copiesByDay[day] = { copied: 0, skipped: 0, failed: 0, volume: 0 };
    if (copy.status === "COPIED") {
      copiesByDay[day].copied += 1;
      copiesByDay[day].volume += toNumber(copy.stake);
    } else if (copy.status === "SKIPPED") {
      copiesByDay[day].skipped += 1;
      const reason = copy.skipReason || "UNKNOWN";
      skipReasons[reason] = (skipReasons[reason] || 0) + 1;
    } else {
      copiesByDay[day].failed += 1;
    }
  }

  const activeCount = profile.subscriptions.filter((sub) => sub.status === "ACTIVE").length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const payoutSummary = await summarizeCreatorRevenue({
    creatorId,
    periodStart: monthStart,
    periodEnd: monthEnd,
  });
  return {
    ok: true,
    copiesByDay: Object.entries(copiesByDay)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    skipReasons,
    estimatedRevenueCents: activeCount * (profile.priceCents ?? 0),
    payoutSummary: {
      grossCents: payoutSummary.grossCents,
      feeCents: payoutSummary.feeCents,
      netCents: payoutSummary.netCents,
    },
  };
}

export async function getCreatorRevenueSummary({ creatorId }) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const summary = await summarizeCreatorRevenue({ creatorId, periodStart, periodEnd });
  return { ok: true, periodStart, periodEnd, ...summary };
}

export async function getMarketplaceModerationQueue() {
  const queue = await listModerationQueue();
  return { ok: true, queue };
}

export async function moderateMarketplaceProfile({ actorId, profileId, action, reason }) {
  const valid = ["APPROVED", "REJECTED", "TAKEDOWN", "RESTORED", "NOTE"];
  if (!valid.includes(action)) return { ok: false, message: "Invalid moderation action." };
  await recordModerationEvent({ actorId, profileId, action, reason });
  return { ok: true };
}

export async function recordInvoiceRevenue({ profileId, actorId, amountCents, invoiceId, billingSubscriptionId }) {
  await appendCreatorRevenueEvent({
    profileId,
    actorId,
    amountCents,
    type: "INVOICE_PAID",
    metadata: { invoiceId, billingSubscriptionId },
  });
}

export { publicProfile, publicSubscription, recomputeProfileStats, MAX_ALLOCATION_PCT };
