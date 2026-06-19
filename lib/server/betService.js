import { calculateOrderPreview, calculatePayout } from "../marketMath.js";
import { createLmsrMarketFromMarket } from "../lmsrMarket.js";
import { createBetLedgerEntries } from "../accounting.js";
import { defaultState } from "../defaultState.js";
import { evaluateRealMoneyBetEligibility } from "../paymentCompliance.js";
import {
  buildTradeExecution,
  feeRevenueLedgerData,
  normalizeTradingMode,
} from "../tradeExecution.js";
import { getDatabaseState, ensureDemoDatabaseSeed, databaseMapping } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

function toNumber(value) {
  return Number(value ?? 0);
}

function getConfigValue(rows, key) {
  const row = rows.find((item) => item.key === key);
  return row ? row.value : defaultState.adminConfig[key];
}

function getAdminConfig(rows) {
  return Object.fromEntries(
    Object.keys(defaultState.adminConfig).map((key) => [key, getConfigValue(rows, key)]),
  );
}

function findBalanceAccount(user, currency) {
  return user.balanceAccounts.find((account) => account.currency === currency);
}

export async function placeDatabaseBet({
  marketId,
  side,
  betDraft,
  userId = defaultState.currentUser.id,
  isPaper = false,
  copiedFromProfileId = null,
  copyTradeId = null,
  client = prisma,
}) {
  await ensureDemoDatabaseSeed(client);
  const tradingMode = normalizeTradingMode({ isPaper });
  const isPaperTrade = tradingMode === "paper";

  const outcome = await client.$transaction(async (tx) => {
    const [user, market, configRows] = await Promise.all([
      tx.user.findUnique({
        where: { id: userId },
        include: { balanceAccounts: true, verificationChecks: true },
      }),
      tx.market.findUnique({
        where: { id: marketId },
        include: { boosts: true, liquidityPool: true },
      }),
      tx.adminConfig.findMany(),
    ]);

    if (!user) {
      return { ok: false, message: "User was not found." };
    }

    if (user.frozen) {
      return { ok: false, message: "This account is frozen and cannot place bets." };
    }
    if (!isPaperTrade) {
      const compliance = evaluateRealMoneyBetEligibility({ user });
      if (!compliance.ok) {
        return {
          ok: false,
          message: compliance.blockingReasons[0] || "Real-money trading requirements are not satisfied.",
        };
      }
    }

    if (!market) {
      return { ok: false, message: "Market was not found." };
    }

    if (market.status !== "ACTIVE") {
      return {
        ok: false,
        message: `This market is ${String(market.status).toLowerCase()} and is not accepting bets.`,
      };
    }

    const marketForPayout = {
      ...market,
      yesPrice: toNumber(market.yesPrice),
      noPrice: toNumber(market.noPrice),
      volume: toNumber(market.volume),
      bonusPayoutCap: market.bonusPayoutCap ? toNumber(market.bonusPayoutCap) : undefined,
      friendsBoosting: market.boosts.length,
    };

    function previewDraftTrade() {
      return calculateOrderPreview({
        stake: betDraft.inputMode === "shares" ? 0 : betDraft.stake,
        shares: betDraft.inputMode === "shares" ? betDraft.shareCount : undefined,
        side,
        market: marketForPayout,
      });
    }

    async function applyLmsrTradeUpdate(tx, shares) {
      const pool = market.liquidityPool;
      if (!pool) return;
      const lmsr = createLmsrMarketFromMarket({ liquidityPool: pool });
      const executed = side === "YES" ? lmsr.buyYes(shares) : lmsr.buyNo(shares);
      await tx.liquidityPool.update({
        where: { marketId },
        data: {
          yesReserve: executed.qYes,
          noReserve: executed.qNo,
        },
      });
      await tx.market.update({
        where: { id: marketId },
        data: { yesPrice: executed.afterProbability.yes, noPrice: executed.afterProbability.no },
      });
      await tx.oddsSnapshot.create({
        data: {
          marketId,
          yesPrice: executed.afterProbability.yes,
          noPrice: executed.afterProbability.no,
          source: "lmsr_trade",
        },
      });
    }

    const tradePreview = previewDraftTrade();
    const execution = buildTradeExecution({
      tradingMode,
      grossAmount: tradePreview.estimatedCost,
      netAmount: tradePreview.netStake,
      feeBps: tradePreview.feeBps,
    });
    const totalCost = execution.grossAmount;
    const withdrawableAccount = findBalanceAccount(user, "WITHDRAWABLE");
    const bonusAccount = findBalanceAccount(user, "BONUS");
    const paperAccount = findBalanceAccount(user, "PAPER");
    const withdrawableShare = isPaperTrade
      ? totalCost
      : betDraft.inputMode === "shares"
        ? totalCost
        : betDraft.withdrawableShare;
    const bonusShare = isPaperTrade || betDraft.inputMode === "shares" ? 0 : betDraft.bonusShare;
    const oddsMultiplier = totalCost > 0 ? tradePreview.estimatedContracts / totalCost : 0;
    const result = calculatePayout({
      stake: totalCost,
      withdrawableShare,
      bonusShare,
      market: marketForPayout,
      adminConfig: getAdminConfig(configRows),
      oddsMultiplier,
    });

    if (result.totalStake <= 0) {
      return { ok: false, message: "Enter a valid stake before placing a bet." };
    }

    if (isPaperTrade && result.totalStake > toNumber(paperAccount?.balance)) {
      return { ok: false, message: "Insufficient paper balance for this bet." };
    }

    if (!isPaperTrade && (
      result.withdrawableStake > toNumber(withdrawableAccount?.balance) ||
      result.bonusStake > toNumber(bonusAccount?.balance)
    )) {
      return { ok: false, message: "Insufficient balance for this funding mix." };
    }

    const bet = await tx.bet.create({
      data: {
        userId,
        marketId,
        side,
        stake: result.totalStake,
        withdrawableStake: isPaperTrade ? 0 : result.withdrawableStake,
        bonusStake: isPaperTrade ? 0 : result.bonusStake,
        expectedMultiplier: oddsMultiplier,
        isPaper: isPaperTrade,
        tradingMode: execution.accountMode,
        grossAmount: execution.grossAmount,
        feeAmount: execution.feeAmount,
        netAmount: execution.netAmount,
        isPaperTrade,
        feeDestination: execution.feeDestination,
        realizedPnL: 0,
        unrealizedPnL: 0,
        copiedFromProfileId,
        copyTradeId,
      },
    });

    if (isPaperTrade) {
      await tx.balanceAccount.update({
        where: { userId_currency: { userId, currency: "PAPER" } },
        data: { balance: { decrement: result.totalStake } },
      });
    } else if (result.withdrawableStake > 0) {
      await tx.balanceAccount.update({
        where: { userId_currency: { userId, currency: "WITHDRAWABLE" } },
        data: { balance: { decrement: result.withdrawableStake } },
      });
    }

    if (result.bonusStake > 0) {
      await tx.balanceAccount.update({
        where: { userId_currency: { userId, currency: "BONUS" } },
        data: { balance: { decrement: result.bonusStake } },
      });
    }

    if (isPaperTrade) {
      await tx.ledgerEntry.create({
        data: {
          userId,
          marketId,
          betId: bet.id,
          transactionType: "DEBIT",
          amount: result.totalStake,
          currency: "PAPER",
          source: "BET_PLACED",
          metadata: {
            note: copiedFromProfileId
              ? `Copied paper bet: ${side} on "${market.title}" @ ${oddsMultiplier.toFixed(3)}x`
              : `Paper bet: ${side} on "${market.title}" @ ${oddsMultiplier.toFixed(3)}x`,
            tradingMode,
            grossAmount: execution.grossAmount,
            feeAmount: execution.feeAmount,
            netAmount: execution.netAmount,
            feeDestination: execution.feeDestination,
            copiedFromProfileId,
            copyTradeId,
          },
        },
      });
    } else {
      const ledgerEntries = createBetLedgerEntries({
        userId,
        marketId,
        betId: bet.id,
        side,
        marketTitle: market.title,
        withdrawableStake: result.withdrawableStake,
        bonusStake: result.bonusStake,
      });
      const feeRevenueEntry = feeRevenueLedgerData({
        userId,
        marketId,
        betId: bet.id,
        feeAmount: execution.feeAmount,
        tradingMode,
        note: `Trading fee: ${side} on "${market.title}"`,
      });

      await tx.ledgerEntry.createMany({
        data: [
          ...ledgerEntries.map((entry) => ({
            userId: entry.user_id,
            marketId: entry.market_id,
            betId: entry.bet_id,
            transactionType: databaseMapping.toLedgerTransactionType(entry.transaction_type),
            amount: entry.amount,
            currency: databaseMapping.toBalanceCurrency(entry.currency_type),
            source: databaseMapping.toLedgerSource(entry.source),
            metadata: { note: entry.metadata },
          })),
          ...(feeRevenueEntry ? [feeRevenueEntry] : []),
        ],
      });
    }

    await tx.market.update({
      where: { id: marketId },
      data: { volume: { increment: result.totalStake } },
    });

    await applyLmsrTradeUpdate(tx, tradePreview.estimatedContracts);

    await tx.auditTrail.create({
      data: {
        actorId: userId,
        marketId,
        action: isPaperTrade ? "bet.placed.paper" : "bet.placed",
        metadata: {
          betId: bet.id,
          side,
          totalStake: result.totalStake,
          withdrawableStake: isPaperTrade ? 0 : result.withdrawableStake,
          bonusStake: isPaperTrade ? 0 : result.bonusStake,
          oddsMultiplier,
          tradingMode,
          grossAmount: execution.grossAmount,
          feeAmount: execution.feeAmount,
          netAmount: execution.netAmount,
          feeDestination: execution.feeDestination,
          copiedFromProfileId,
          copyTradeId,
        },
      },
    });

    return {
      ok: true,
      betId: bet.id,
      tradingMode,
      isPaper: isPaperTrade,
      grossAmount: execution.grossAmount,
      feeAmount: execution.feeAmount,
      netAmount: execution.netAmount,
      feeDestination: execution.feeDestination,
      message: isPaperTrade
        ? `Paper trade: ${side} on "${market.title}" for $${result.totalStake.toFixed(2)}.`
        : `Placed a ${side} bet on "${market.title}" for $${result.totalStake.toFixed(2)}.`,
    };
  });

  return {
    ...outcome,
    state: await getDatabaseState(client, userId),
  };
}

export async function placeBet({ marketId, side, betDraft, userId, isPaper, copiedFromProfileId, copyTradeId }) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  return placeDatabaseBet({ marketId, side, betDraft, userId, isPaper, copiedFromProfileId, copyTradeId });
}

export async function sellDatabaseBet({ betId, userId, client = prisma }) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);

  const outcome = await client.$transaction(async (tx) => {
    const bet = await tx.bet.findUnique({
      where: { id: betId },
      include: { market: { include: { liquidityPool: true } } },
    });

    if (!bet) return { ok: false, message: "Bet not found." };
    if (bet.userId !== userId) return { ok: false, message: "Not authorised." };
    if (bet.status !== "OPEN") return { ok: false, message: "Only open bets can be sold." };
    if (!["ACTIVE", "PAUSED"].includes(bet.market.status)) {
      return { ok: false, message: "Cannot sell a bet on a market that has already resolved." };
    }

    const stake = toNumber(bet.stake);
    const oddsMultiplier = toNumber(bet.expectedMultiplier) || 2;
    const shares = stake * oddsMultiplier;

    const lmsr = bet.market.liquidityPool
      ? createLmsrMarketFromMarket({ liquidityPool: bet.market.liquidityPool })
      : null;
    const executed = lmsr ? (bet.side === "YES" ? lmsr.sellYes(shares) : lmsr.sellNo(shares)) : null;
    const currentPrice = bet.side === "YES"
      ? toNumber(bet.market.yesPrice)
      : toNumber(bet.market.noPrice);
    const proceeds = Math.max(0, executed ? executed.proceeds : shares * currentPrice);
    // Store the effective sell multiplier so payout = stake × sellMultiplier = proceeds
    const sellMultiplier = proceeds / (stake || 1);

    const currency = bet.isPaper ? "PAPER" : "WITHDRAWABLE";

    await tx.bet.update({
      where: { id: betId },
      data: {
        status: "SOLD",
        settledAt: new Date(),
        expectedMultiplier: sellMultiplier,
        realizedPnL: proceeds - stake,
        unrealizedPnL: 0,
      },
    });

    await tx.balanceAccount.update({
      where: { userId_currency: { userId, currency } },
      data: { balance: { increment: proceeds } },
    });

    await tx.ledgerEntry.create({
      data: {
        userId,
        marketId: bet.marketId,
        betId,
        transactionType: "CREDIT",
        amount: proceeds,
        currency: bet.isPaper ? "PAPER" : "WITHDRAWABLE",
        source: "BET_SETTLED",
        metadata: {
          note: `Sold ${bet.side} position on "${bet.market.title}" for $${proceeds.toFixed(2)}`,
        },
      },
    });

    if (bet.market.liquidityPool && executed) {
      await tx.liquidityPool.update({
        where: { marketId: bet.marketId },
        data: {
          yesReserve: executed.qYes,
          noReserve: executed.qNo,
        },
      });
      await tx.market.update({
        where: { id: bet.marketId },
        data: {
          yesPrice: executed.afterProbability.yes,
          noPrice: executed.afterProbability.no,
        },
      });
      await tx.oddsSnapshot.create({
        data: {
          marketId: bet.marketId,
          yesPrice: executed.afterProbability.yes,
          noPrice: executed.afterProbability.no,
          source: "lmsr_sell",
        },
      });
    }

    await tx.auditTrail.create({
      data: {
        actorId: userId,
        marketId: bet.marketId,
        action: bet.isPaper ? "bet.sold.paper" : "bet.sold",
        metadata: { betId, proceeds, originalStake: stake, sellMultiplier },
      },
    });

    return {
      ok: true,
      proceeds,
      message: `Sold position for $${proceeds.toFixed(2)}.`,
    };
  });

  return { ...outcome, state: await getDatabaseState(client, userId) };
}
