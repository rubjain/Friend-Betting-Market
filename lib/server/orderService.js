import { prisma, hasDatabaseUrl } from "./prisma.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";

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
  const order = await prisma.order.create({
    data: {
      userId,
      marketId,
      side: side.toUpperCase().includes("YES") ? "BUY_YES" : "BUY_NO",
      quantity,
      limitPrice,
      isPaper: Boolean(isPaper),
      expiresAt: expiryDate(limitExpiry),
    },
    include: { market: { select: { title: true, yesPrice: true, noPrice: true } } },
  });
  return { ok: true, order, message: `Limit order placed: ${side} at ${Math.round(limitPrice * 100)}¢` };
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
    include: { market: true },
  });

  const filled = [];
  for (const order of openOrders) {
    const market = order.market;
    if (!market || market.status !== "ACTIVE") continue;
    const currentPrice = order.side === "BUY_YES"
      ? toNumber(market.yesPrice)
      : toNumber(market.noPrice);
    if (currentPrice > toNumber(order.limitPrice)) continue;

    const side = order.side === "BUY_YES" ? "YES" : "NO";
    const dollarCost = toNumber(order.quantity) * currentPrice;

    await client.$transaction(async (tx) => {
      const currency = order.isPaper ? "PAPER" : "WITHDRAWABLE";
      const account = await tx.balanceAccount.findUnique({
        where: { userId_currency: { userId, currency } },
      });
      if (!account || toNumber(account.balance) < dollarCost) return;

      await tx.balanceAccount.update({
        where: { userId_currency: { userId, currency } },
        data: { balance: { decrement: dollarCost } },
      });

      await tx.bet.create({
        data: {
          userId,
          marketId: market.id,
          side,
          stake: dollarCost,
          withdrawableStake: order.isPaper ? 0 : dollarCost,
          bonusStake: 0,
          expectedMultiplier: 1 / currentPrice,
          isPaper: order.isPaper,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "FILLED", filledQty: order.quantity },
      });

      await tx.ledgerEntry.create({
        data: {
          userId,
          marketId: market.id,
          transactionType: "DEBIT",
          amount: dollarCost,
          currency,
          source: "BET_PLACED",
          metadata: { note: `Limit order filled: ${side} on "${market.title}" at ${Math.round(currentPrice * 100)}¢` },
        },
      });
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
    expiresAt: o.expiresAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
  }));
}
