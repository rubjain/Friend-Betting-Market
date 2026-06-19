import { prisma, hasDatabaseUrl } from "./prisma.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";
import { evaluateRealMoneyBetEligibility } from "../paymentCompliance.js";
import { createLmsrMarketFromMarket } from "../lmsrMarket.js";
import {
  buildTradeExecution,
  feeRevenueLedgerData,
  normalizeTradingMode,
} from "../tradeExecution.js";

function toNumber(v) { return Number(v ?? 0); }

function expiryDate(limitExpiry) {
  if (!limitExpiry || limitExpiry === "never") return null;
  const days = limitExpiry === "1d" ? 1 : limitExpiry === "7d" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function createLimitOrder({ userId, marketId, side, quantity, limitPrice, isPaper, limitExpiry }) {
  await ensureDemoDatabaseSeed();
  const tradingMode = normalizeTradingMode({ isPaper });
  const order = await prisma.order.create({
    data: {
      userId,
      marketId,
      side: side.toUpperCase().includes("YES") ? "BUY_YES" : "BUY_NO",
      quantity,
      limitPrice,
      isPaper: Boolean(isPaper),
      tradingMode: tradingMode.toUpperCase(),
      expiresAt: expiryDate(limitExpiry),
    },
    include: { market: { select: { title: true, yesPrice: true, noPrice: true } } },
  });
  return { ok: true, order, tradingMode, message: `Limit order placed: ${side} at ${Math.round(limitPrice * 100)}c` };
}

export async function getOpenOrders(userId) {
  await ensureDemoDatabaseSeed();
  const now = new Date();
  return prisma.order.findMany({
    where: {
      userId,
      status: "OPEN",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { market: { select: { id: true, title: true, yesPrice: true, noPrice: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelOrder(orderId, userId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== userId) return { ok: false, message: "Order not found." };
  if (order.status !== "OPEN") return { ok: false, message: "Only open orders can be cancelled." };
  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELED" } });
  return { ok: true, message: "Order cancelled." };
}

export async function fillEligibleOrders(userId, client = prisma) {
  const now = new Date();
  const openOrders = await client.order.findMany({
    where: {
      userId,
      status: "OPEN",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { market: { include: { liquidityPool: true } } },
  });

  const filled = [];
  for (const order of openOrders) {
    const market = order.market;
    if (!market || market.status !== "ACTIVE") continue;
    const tradingMode = normalizeTradingMode({ isPaper: order.isPaper, tradingMode: order.tradingMode });
    const lmsr = createLmsrMarketFromMarket(market);
    const probabilities = lmsr.getProbability();
    const currentPrice = order.side === "BUY_YES" ? probabilities.yes : probabilities.no;
    if (currentPrice > toNumber(order.limitPrice)) continue;

    const side = order.side === "BUY_YES" ? "YES" : "NO";
    const sideShares = toNumber(order.quantity);
    const preview = lmsr.previewBuy(side, sideShares);
    if (preview.averagePrice > toNumber(order.limitPrice)) continue;
    const dollarCost = preview.cost;
    const execution = buildTradeExecution({
      tradingMode,
      netAmount: dollarCost,
      feeBps: market.liquidityPool?.feeBps ?? market.feeBps ?? 0,
    });

    if (tradingMode !== "paper") {
      const user = await client.user.findUnique({
        where: { id: userId },
        include: { verificationChecks: true },
      });
      const compliance = evaluateRealMoneyBetEligibility({ user });
      if (!compliance.ok) continue;
    }

    await client.$transaction(async (tx) => {
      const currency = order.isPaper ? "PAPER" : "WITHDRAWABLE";
      const account = await tx.balanceAccount.findUnique({
        where: { userId_currency: { userId, currency } },
      });
      if (!account || toNumber(account.balance) < execution.grossAmount) return;

      await tx.balanceAccount.update({
        where: { userId_currency: { userId, currency } },
        data: { balance: { decrement: execution.grossAmount } },
      });

      const executed = side === "YES" ? lmsr.buyYes(sideShares) : lmsr.buyNo(sideShares);

      const bet = await tx.bet.create({
        data: {
          userId,
          marketId: market.id,
          side,
          stake: execution.grossAmount,
          withdrawableStake: order.isPaper ? 0 : execution.grossAmount,
          bonusStake: 0,
          expectedMultiplier: sideShares / (execution.grossAmount || 1),
          isPaper: order.isPaper,
          tradingMode: execution.accountMode,
          grossAmount: execution.grossAmount,
          feeAmount: execution.feeAmount,
          netAmount: execution.netAmount,
          isPaperTrade: execution.isPaperTrade,
          feeDestination: execution.feeDestination,
          realizedPnL: 0,
          unrealizedPnL: 0,
        },
      });

      if (market.liquidityPool) {
        await tx.liquidityPool.update({
          where: { marketId: market.id },
          data: {
            yesReserve: executed.qYes,
            noReserve: executed.qNo,
          },
        });
        await tx.market.update({
          where: { id: market.id },
          data: {
            yesPrice: executed.afterProbability.yes,
            noPrice: executed.afterProbability.no,
            volume: { increment: execution.grossAmount },
          },
        });
        await tx.oddsSnapshot.create({
          data: {
            marketId: market.id,
            yesPrice: executed.afterProbability.yes,
            noPrice: executed.afterProbability.no,
            source: "lmsr_limit_fill",
          },
        });
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "FILLED",
          filledQty: order.quantity,
          grossAmount: execution.grossAmount,
          feeAmount: execution.feeAmount,
          netAmount: execution.netAmount,
          isPaperTrade: execution.isPaperTrade,
          feeDestination: execution.feeDestination,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          marketId: market.id,
          betId: bet.id,
          transactionType: "DEBIT",
          amount: execution.grossAmount,
          currency,
          source: "BET_PLACED",
          metadata: {
            note: `Limit order filled: ${side} on "${market.title}" at ${Math.round(currentPrice * 100)}c`,
            tradingMode,
            grossAmount: execution.grossAmount,
            feeAmount: execution.feeAmount,
            netAmount: execution.netAmount,
            feeDestination: execution.feeDestination,
          },
        },
      });

      const feeRevenueEntry = feeRevenueLedgerData({
        userId,
        marketId: market.id,
        betId: bet.id,
        feeAmount: execution.feeAmount,
        tradingMode,
        note: `Limit fill fee: ${side} on "${market.title}"`,
      });
      if (feeRevenueEntry) {
        await tx.ledgerEntry.create({ data: feeRevenueEntry });
      }
    });

    filled.push(order.id);
  }

  await client.order.updateMany({
    where: {
      userId,
      status: "OPEN",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  return filled;
}

export async function getOrdersForState(userId) {
  const orders = await getOpenOrders(userId);
  return orders.map((o) => ({
    id: o.id,
    marketId: o.market.id,
    market: o.market.title,
    side: o.side === "BUY_YES" ? "YES" : "NO",
    quantity: toNumber(o.quantity),
    limitPrice: toNumber(o.limitPrice),
    limitPriceCents: Math.round(toNumber(o.limitPrice) * 100),
    currentPrice: o.side === "BUY_YES" ? toNumber(o.market.yesPrice) : toNumber(o.market.noPrice),
    dollarCost: toNumber(o.quantity) * toNumber(o.limitPrice),
    isPaper: o.isPaper,
    tradingMode: normalizeTradingMode({ isPaper: o.isPaper, tradingMode: o.tradingMode }),
    grossAmount: toNumber(o.grossAmount),
    feeAmount: toNumber(o.feeAmount),
    netAmount: toNumber(o.netAmount),
    feeDestination: o.feeDestination,
    expiresAt: o.expiresAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
  }));
}
