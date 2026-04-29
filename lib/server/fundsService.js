import { createFundsCreditEntry } from "../accounting.js";
import { defaultState } from "../defaultState.js";
import { getDatabaseState, ensureDemoDatabaseSeed, databaseMapping } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

async function creditFunds({
  amount,
  currencyType,
  source,
  metadata,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  await ensureDemoDatabaseSeed(client);

  const result = await client.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { ok: false, message: "User was not found." };
    }

    const currency = databaseMapping.toBalanceCurrency(currencyType);
    await tx.balanceAccount.upsert({
      where: { userId_currency: { userId, currency } },
      update: { balance: { increment: amount } },
      create: { userId, currency, balance: amount },
    });

    const entry = createFundsCreditEntry({ userId, amount, currencyType, source, metadata });
    await tx.ledgerEntry.create({
      data: {
        userId: entry.user_id,
        marketId: entry.market_id,
        betId: entry.bet_id,
        transactionType: databaseMapping.toLedgerTransactionType(entry.transaction_type),
        amount: entry.amount,
        currency: databaseMapping.toBalanceCurrency(entry.currency_type),
        source: databaseMapping.toLedgerSource(entry.source),
        metadata: { note: entry.metadata },
      },
    });

    await tx.auditTrail.create({
      data: {
        actorId: userId,
        action: "funds.credit",
        metadata: { amount, currencyType, source, metadata },
      },
    });

    return { ok: true };
  });

  return { ...result, state: await getDatabaseState(client, userId) };
}

export async function addDatabaseDeposit({ userId } = {}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const result = await creditFunds({
    amount: 25,
    currencyType: "withdrawable",
    source: "deposit",
    metadata: "Demo play-money deposit",
    userId,
  });

  return {
    ...result,
    message: result.ok ? "Added a $25 play-money deposit to withdrawable balance." : result.message,
  };
}

export async function grantDatabaseBonus({ userId } = {}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const result = await creditFunds({
    amount: 10,
    currencyType: "bonus",
    source: "admin_adjustment",
    metadata: "Demo admin bonus grant",
    userId,
  });

  if (result.ok) {
    await prisma.adminConfig.upsert({
      where: { key: "bonusLiability" },
      update: { value: Number(result.state.adminConfig.bonusLiability) + 10 },
      create: { key: "bonusLiability", value: defaultState.adminConfig.bonusLiability + 10 },
    });
    result.state = await getDatabaseState(prisma, userId ?? defaultState.currentUser.id);
  }

  return {
    ...result,
    message: result.ok ? "Granted a $10 bonus credit and updated bonus liability." : result.message,
  };
}
