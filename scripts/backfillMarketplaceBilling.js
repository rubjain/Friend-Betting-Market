import { hasDatabaseUrl, prisma } from "../lib/server/prisma.js";
import { getOrCreateMarketplacePlan, upsertBillingSubscription } from "../lib/server/marketplaceBillingService.js";
import { grantEntitlement, hasMarketplaceEntitlement } from "../lib/server/marketplaceEntitlementService.js";

function asDate(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

if (!hasDatabaseUrl()) {
  console.error("DATABASE_URL is required for marketplace billing backfill.");
  process.exitCode = 1;
} else {
  const subscriptions = await prisma.strategySubscription.findMany({
    where: { status: "ACTIVE" },
    include: { profile: { select: { id: true, name: true, priceCents: true } } },
  });

  let plansCreated = 0;
  let subscriptionsBackfilled = 0;
  let entitlementsCreated = 0;

  for (const row of subscriptions) {
    const plan = await getOrCreateMarketplacePlan({
      profileId: row.profileId,
      amountCents: Number(row.profile?.priceCents || 0),
      interval: "MONTH",
      name: `${row.profile?.name || "Strategy"} Monthly`,
    });
    if (plan?.plan?.id && !String(plan.plan.id).startsWith("demo-")) {
      plansCreated += 1;
    }

    const sub = await upsertBillingSubscription({
      userId: row.userId,
      profileId: row.profileId,
      planId: plan.plan.id,
      status: "ACTIVE",
      provider: "legacy-backfill",
      currentPeriodStart: asDate(row.startedAt),
      metadata: { source: "strategy_subscription_backfill", strategySubscriptionId: row.id },
    });
    subscriptionsBackfilled += sub?.subscription?.id ? 1 : 0;

    const entitled = await hasMarketplaceEntitlement({ userId: row.userId, profileId: row.profileId });
    if (!entitled) {
      await grantEntitlement({
        userId: row.userId,
        profileId: row.profileId,
        billingSubscriptionId: sub.subscription.id,
        startsAt: asDate(row.startedAt),
        status: "ACTIVE",
        source: "backfill",
        reason: "Backfilled from StrategySubscription",
        metadata: { strategySubscriptionId: row.id },
      });
      entitlementsCreated += 1;
    }
  }

  console.log("Marketplace billing backfill complete.");
  console.table({
    activeStrategySubscriptions: subscriptions.length,
    plansTouched: plansCreated,
    billingSubscriptionsTouched: subscriptionsBackfilled,
    entitlementsCreated,
  });
}

await prisma.$disconnect();
