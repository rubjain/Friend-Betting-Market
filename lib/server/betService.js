import { calculatePayout } from "../marketMath.js";
import { createBetLedgerEntries } from "../accounting.js";
import { defaultState } from "../defaultState.js";
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
  client = prisma,
}) {
  await ensureDemoDatabaseSeed(client);

  const outcome = await client.$transaction(async (tx) => {
    const [user, market, configRows] = await Promise.all([
      tx.user.findUnique({
        where: { id: userId },
        include: { balanceAccounts: true },
      }),
      tx.market.findUnique({
        where: { id: marketId },
        include: { boosts: true },
      }),
      tx.adminConfig.findMany(),
    ]);

    if (!user) {
      return { ok: false, message: "User was not found." };
    }

    if (user.frozen) {
      return { ok: false, message: "This account is frozen and cannot place bets." };
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

    const withdrawableAccount = findBalanceAccount(user, "WITHDRAWABLE");
    const bonusAccount = findBalanceAccount(user, "BONUS");
    const marketForPayout = {
      ...market,
      yesPrice: toNumber(market.yesPrice),
      noPrice: toNumber(market.noPrice),
      volume: toNumber(market.volume),
      bonusPayoutCap: market.bonusPayoutCap ? toNumber(market.bonusPayoutCap) : undefined,
      friendsBoosting: market.boosts.length,
    };
    const result = calculatePayout({
      stake: betDraft.stake,
      withdrawableShare: betDraft.withdrawableShare,
      bonusShare: betDraft.bonusShare,
      market: marketForPayout,
      adminConfig: getAdminConfig(configRows),
    });

    if (result.totalStake <= 0) {
      return { ok: false, message: "Enter a valid stake before placing a bet." };
    }

    if (
      result.withdrawableStake > toNumber(withdrawableAccount?.balance) ||
      result.bonusStake > toNumber(bonusAccount?.balance)
    ) {
      return { ok: false, message: "Insufficient balance for this funding mix." };
    }

    const bet = await tx.bet.create({
      data: {
        userId,
        marketId,
        side,
        stake: result.totalStake,
        withdrawableStake: result.withdrawableStake,
        bonusStake: result.bonusStake,
        expectedMultiplier: result.multiplier,
      },
    });

    if (result.withdrawableStake > 0) {
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

    const ledgerEntries = createBetLedgerEntries({
      userId,
      marketId,
      betId: bet.id,
      side,
      marketTitle: market.title,
      withdrawableStake: result.withdrawableStake,
      bonusStake: result.bonusStake,
    });

    await tx.ledgerEntry.createMany({
      data: ledgerEntries.map((entry) => ({
        userId: entry.user_id,
        marketId: entry.market_id,
        betId: entry.bet_id,
        transactionType: databaseMapping.toLedgerTransactionType(entry.transaction_type),
        amount: entry.amount,
        currency: databaseMapping.toBalanceCurrency(entry.currency_type),
        source: databaseMapping.toLedgerSource(entry.source),
        metadata: { note: entry.metadata },
      })),
    });

    await tx.market.update({
      where: { id: marketId },
      data: { volume: { increment: result.totalStake } },
    });

    await tx.auditTrail.create({
      data: {
        actorId: userId,
        marketId,
        action: "bet.placed",
        metadata: {
          betId: bet.id,
          side,
          totalStake: result.totalStake,
          withdrawableStake: result.withdrawableStake,
          bonusStake: result.bonusStake,
        },
      },
    });

    return {
      ok: true,
      message: `Placed a ${side} bet on "${market.title}" for $${result.totalStake.toFixed(2)}.`,
    };
  });

  return {
    ...outcome,
    state: await getDatabaseState(client, userId),
  };
}

export async function placeBet({ marketId, side, betDraft, userId }) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  return placeDatabaseBet({ marketId, side, betDraft, userId });
}
