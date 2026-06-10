import { placeBet } from "./betService.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";
import { recomputeProfileStats } from "./strategyMarketplaceService.js";

function toNumber(value) {
  return Number(value ?? 0);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function skipCopy({ signal, subscription, reason, stake = 0, client = prisma }) {
  return client.copyTrade.upsert({
    where: { signalId_subscriptionId: { signalId: signal.id, subscriptionId: subscription.id } },
    create: {
      signalId: signal.id,
      subscriptionId: subscription.id,
      subscriberId: subscription.userId,
      accountMode: subscription.accountMode,
      status: "SKIPPED",
      skipReason: reason,
      stake,
    },
    update: { status: "SKIPPED", skipReason: reason, stake },
  });
}

async function realizedCopiedLossToday(subscription, client = prisma) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const copied = await client.copyTrade.findMany({
    where: {
      subscriptionId: subscription.id,
      status: "COPIED",
      createdAt: { gte: start },
      copiedBetId: { not: null },
    },
    select: { copiedBetId: true, stake: true },
  });
  if (!copied.length) return 0;
  const bets = await client.bet.findMany({
    where: { id: { in: copied.map((item) => item.copiedBetId).filter(Boolean) }, status: { not: "OPEN" } },
    select: { id: true, status: true, stake: true, expectedMultiplier: true },
  });
  return bets.reduce((loss, bet) => {
    const stake = toNumber(bet.stake);
    if (bet.status === "LOST") return loss + stake;
    if (bet.status === "SOLD") {
      const proceeds = stake * toNumber(bet.expectedMultiplier);
      return proceeds < stake ? loss + (stake - proceeds) : loss;
    }
    return loss;
  }, 0);
}

async function validateCopy({ signal, subscription, client = prisma }) {
  if (subscription.status !== "ACTIVE" || !subscription.autoCopyEnabled) return { ok: false, reason: "SUBSCRIPTION_PAUSED" };
  if (subscription.accountMode !== "PAPER") return { ok: false, reason: "REAL_COPY_DISABLED" };
  if (subscription.profile.status !== "PUBLISHED") return { ok: false, reason: "PROFILE_NOT_PUBLISHED" };
  if (subscription.profile.strategy.status !== "ACTIVE") return { ok: false, reason: "STRATEGY_NOT_ACTIVE" };
  if (subscription.user.frozen) return { ok: false, reason: "ACCOUNT_FROZEN" };

  const allowed = subscription.allowedMarketIds || [];
  if (allowed.length && !allowed.includes(signal.marketId)) return { ok: false, reason: "MARKET_NOT_ALLOWED" };

  const market = await client.market.findUnique({ where: { id: signal.marketId }, select: { status: true } });
  if (!market || market.status !== "ACTIVE") return { ok: false, reason: "MARKET_NOT_ACTIVE" };

  const allocationStake = roundMoney(toNumber(signal.sourceStake) * (toNumber(subscription.allocationPct) / 100));
  const cappedStake = subscription.maxTradeSize != null
    ? Math.min(allocationStake, toNumber(subscription.maxTradeSize))
    : allocationStake;
  const stake = roundMoney(cappedStake);
  if (stake <= 0.5) return { ok: false, reason: "STAKE_TOO_SMALL", stake };

  const paperAccount = subscription.user.balanceAccounts.find((account) => account.currency === "PAPER");
  if (toNumber(paperAccount?.balance) < stake) return { ok: false, reason: "INSUFFICIENT_BALANCE", stake };

  if (subscription.maxOpenPositions != null) {
    const openCount = await client.bet.count({
      where: {
        userId: subscription.userId,
        isPaper: true,
        status: "OPEN",
        copyTradeId: { not: null },
      },
    });
    if (openCount >= subscription.maxOpenPositions) return { ok: false, reason: "MAX_OPEN_POSITIONS", stake };
  }

  if (subscription.maxDailyLoss != null) {
    const loss = await realizedCopiedLossToday(subscription, client);
    if (loss >= toNumber(subscription.maxDailyLoss)) return { ok: false, reason: "MAX_DAILY_LOSS", stake };
  }

  return { ok: true, stake };
}

export async function copySignalToSubscribers(signalId, { client = prisma } = {}) {
  if (!hasDatabaseUrl()) {
    return { ok: true, copied: 0, skipped: 0, failed: 0 };
  }

  const signal = await client.strategyTradeSignal.findUnique({
    where: { id: signalId },
    include: { profile: { include: { strategy: true } } },
  });
  if (!signal) return { ok: false, message: "Signal not found." };

  const subscriptions = await client.strategySubscription.findMany({
    where: { profileId: signal.profileId, accountMode: "PAPER", status: { in: ["ACTIVE", "PAUSED"] } },
    include: {
      profile: { include: { strategy: true } },
      user: { include: { balanceAccounts: true } },
    },
  });

  let copied = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    const prior = await client.copyTrade.findUnique({
      where: { signalId_subscriptionId: { signalId: signal.id, subscriptionId: subscription.id } },
    });
    if (prior) continue;

    const validation = await validateCopy({ signal, subscription, client });
    if (!validation.ok) {
      await skipCopy({ signal, subscription, reason: validation.reason, stake: validation.stake || 0, client });
      skipped += 1;
      continue;
    }

    const copyTrade = await client.copyTrade.create({
      data: {
        signalId: signal.id,
        subscriptionId: subscription.id,
        subscriberId: subscription.userId,
        accountMode: "PAPER",
        status: "FAILED",
        stake: validation.stake,
      },
    });

    try {
      const result = await placeBet({
        marketId: signal.marketId,
        side: signal.side,
        betDraft: {
          stake: validation.stake,
          withdrawableShare: validation.stake,
          bonusShare: 0,
        },
        userId: subscription.userId,
        isPaper: true,
        copiedFromProfileId: signal.profileId,
        copyTradeId: copyTrade.id,
      });

      if (result?.ok) {
        await client.copyTrade.update({
          where: { id: copyTrade.id },
          data: { status: "COPIED", copiedBetId: result.betId || null, skipReason: null },
        });
        copied += 1;
      } else {
        await client.copyTrade.update({
          where: { id: copyTrade.id },
          data: { status: "SKIPPED", skipReason: result?.message || "COPY_FAILED" },
        });
        skipped += 1;
      }
    } catch (error) {
      await client.copyTrade.update({
        where: { id: copyTrade.id },
        data: { status: "FAILED", skipReason: error?.message || "COPY_FAILED" },
      }).catch(() => {});
      failed += 1;
    }
  }

  await client.strategyTradeSignal.update({ where: { id: signal.id }, data: { status: "PROCESSED" } }).catch(() => {});
  await recomputeProfileStats(signal.profileId, client);
  return { ok: true, copied, skipped, failed };
}

export async function recordStrategySignalFromBet({
  strategyId,
  sourceBetId,
  sourceExecutionId,
  creatorId,
  accountMode = "PAPER",
  marketId,
  side,
  sourceStake,
  client = prisma,
}) {
  if (!hasDatabaseUrl() || !strategyId) return { ok: true, copied: 0, skipped: 0, failed: 0 };

  const mode = String(accountMode || "PAPER").toUpperCase() === "REAL" ? "REAL" : "PAPER";
  if (mode !== "PAPER") return { ok: false, message: "Real-money copy trading is disabled for the MVP." };

  const strategy = await client.strategy.findFirst({
    where: { id: strategyId, userId: creatorId },
    include: { marketplaceProfile: true },
  });
  if (!strategy) return { ok: false, message: "Strategy not found." };
  if (strategy.status !== "ACTIVE") return { ok: false, message: "Strategy is not active." };
  const profile = strategy.marketplaceProfile;
  if (!profile || profile.status !== "PUBLISHED") return { ok: true, copied: 0, skipped: 0, failed: 0, message: "Strategy is not published." };

  let sourceBet = null;
  if (sourceBetId) {
    sourceBet = await client.bet.findUnique({
      where: { id: sourceBetId },
      select: { id: true, marketId: true, side: true, stake: true, isPaper: true },
    });
  }

  const resolvedMarketId = marketId || sourceBet?.marketId;
  const resolvedSide = side || sourceBet?.side;
  const resolvedStake = sourceStake ?? sourceBet?.stake;
  if (!resolvedMarketId || !resolvedSide || Number(resolvedStake) <= 0) {
    return { ok: false, message: "Trade signal is missing market, side, or stake." };
  }

  const idempotencyKey = `${strategyId}:${sourceBetId || `${resolvedMarketId}:${resolvedSide}:${resolvedStake}`}:${mode}`;
  const signal = await client.strategyTradeSignal.upsert({
    where: { idempotencyKey },
    create: {
      strategyId,
      profileId: profile.id,
      creatorId,
      sourceBetId: sourceBetId || null,
      sourceExecutionId: sourceExecutionId || null,
      accountMode: mode,
      marketId: resolvedMarketId,
      side: resolvedSide,
      sourceStake: resolvedStake,
      idempotencyKey,
    },
    update: {},
  });

  await client.auditTrail.create({
    data: {
      actorId: creatorId,
      marketId: resolvedMarketId,
      action: "strategy.copy.signal",
      metadata: { strategyId, profileId: profile.id, signalId: signal.id, sourceBetId: sourceBetId || null },
    },
  }).catch(() => {});

  return copySignalToSubscribers(signal.id, { client });
}
