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

function normalizeFundingAmount(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

function normalizeFundingMethod(method) {
  return String(method || "bank").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_") || "bank";
}

export async function createDatabaseDeposit({ userId, amount, method } = {}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(prisma);
  const depositAmount = normalizeFundingAmount(amount);
  if (depositAmount <= 0) {
    return { ok: false, message: "Enter a deposit amount above zero." };
  }

  const fundingMethod = normalizeFundingMethod(method);
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { ok: false, message: "User was not found." };
    }

    const transaction = await tx.paymentTransaction.create({
      data: {
        userId,
        type: "DEPOSIT",
        status: "COMPLETED",
        amount: depositAmount,
        method: fundingMethod,
        provider: "demo-ledger",
        providerRef: `dep_${Date.now()}`,
        metadata: {
          note: "Demo deposit captured through persisted payment ledger.",
        },
      },
    });

    await tx.balanceAccount.upsert({
      where: { userId_currency: { userId, currency: "WITHDRAWABLE" } },
      update: { balance: { increment: depositAmount } },
      create: { userId, currency: "WITHDRAWABLE", balance: depositAmount },
    });

    const entry = createFundsCreditEntry({
      userId,
      amount: depositAmount,
      currencyType: "withdrawable",
      source: "deposit",
      metadata: `Deposit completed via ${fundingMethod}; payment transaction ${transaction.id}`,
    });
    await tx.ledgerEntry.create({
      data: {
        userId: entry.user_id,
        marketId: entry.market_id,
        betId: entry.bet_id,
        transactionType: databaseMapping.toLedgerTransactionType(entry.transaction_type),
        amount: entry.amount,
        currency: databaseMapping.toBalanceCurrency(entry.currency_type),
        source: databaseMapping.toLedgerSource(entry.source),
        metadata: { note: entry.metadata, paymentTransactionId: transaction.id },
      },
    });

    await tx.auditTrail.create({
      data: {
        actorId: userId,
        action: "payment.deposit.completed",
        metadata: {
          paymentTransactionId: transaction.id,
          amount: depositAmount,
          method: fundingMethod,
          provider: transaction.provider,
        },
      },
    });

    return { ok: true, transaction };
  });

  return {
    ...result,
    state: await getDatabaseState(prisma, userId),
    message: result.ok
      ? `Deposited $${depositAmount.toFixed(2)} through the persisted payment ledger.`
      : result.message,
  };
}

export async function requestDatabaseWithdrawal({ userId, amount, method } = {}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(prisma);
  const withdrawalAmount = normalizeFundingAmount(amount);
  if (withdrawalAmount <= 0) {
    return { ok: false, message: "Enter a withdrawal amount above zero." };
  }

  const fundingMethod = normalizeFundingMethod(method);
  const result = await prisma.$transaction(async (tx) => {
    const account = await tx.balanceAccount.findUnique({
      where: { userId_currency: { userId, currency: "WITHDRAWABLE" } },
    });
    if (!account || Number(account.balance) < withdrawalAmount) {
      return { ok: false, message: "Withdrawal exceeds withdrawable balance." };
    }

    const transaction = await tx.paymentTransaction.create({
      data: {
        userId,
        type: "WITHDRAWAL",
        status: "PENDING_REVIEW",
        amount: withdrawalAmount,
        method: fundingMethod,
        provider: "demo-ledger",
        providerRef: `wd_${Date.now()}`,
        metadata: {
          note: "Funds are held while withdrawal is pending manual review.",
        },
      },
    });

    await tx.balanceAccount.update({
      where: { userId_currency: { userId, currency: "WITHDRAWABLE" } },
      data: { balance: { decrement: withdrawalAmount } },
    });

    await tx.ledgerEntry.create({
      data: {
        userId,
        transactionType: "DEBIT",
        amount: withdrawalAmount,
        currency: "WITHDRAWABLE",
        source: "WITHDRAWAL",
        metadata: {
          note: `Withdrawal requested via ${fundingMethod}; pending review.`,
          paymentTransactionId: transaction.id,
        },
      },
    });

    await tx.auditTrail.create({
      data: {
        actorId: userId,
        action: "payment.withdrawal.requested",
        metadata: {
          paymentTransactionId: transaction.id,
          amount: withdrawalAmount,
          method: fundingMethod,
          status: transaction.status,
        },
      },
    });

    return { ok: true, transaction };
  });

  return {
    ...result,
    state: await getDatabaseState(prisma, userId),
    message: result.ok
      ? `Created a $${withdrawalAmount.toFixed(2)} withdrawal request for review.`
      : result.message,
  };
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
