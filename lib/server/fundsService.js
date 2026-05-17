import { createFundsCreditEntry } from "../accounting.js";
import { defaultState } from "../defaultState.js";
import { evaluatePaymentCompliance } from "../paymentCompliance.js";
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

function toNumber(value) {
  return Number(value ?? 0);
}

export function normalizePaymentReviewDecision(decision) {
  const normalized = String(decision || "").trim().toLowerCase();
  if (normalized === "approve" || normalized === "approved") {
    return "approve";
  }
  if (normalized === "reject" || normalized === "rejected") {
    return "reject";
  }
  return "";
}

export async function getDatabasePaymentReviewQueue({ client = prisma } = {}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const transactions = await client.paymentTransaction.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return {
    ok: true,
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      userId: transaction.userId,
      userName: transaction.user.name,
      type: String(transaction.type).toLowerCase(),
      status: String(transaction.status).toLowerCase(),
      amount: toNumber(transaction.amount),
      currency: String(transaction.currency).toLowerCase(),
      method: transaction.method || "",
      provider: transaction.provider,
      providerRef: transaction.providerRef || "",
      createdAt: transaction.createdAt.toISOString(),
      reviewNotes: transaction.reviewNotes || "",
      metadataNote: transaction.metadata?.note || "",
    })),
  };
}

export async function reviewDatabasePaymentTransaction({
  transactionId,
  decision,
  notes,
  reviewerId,
  client = prisma,
} = {}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const normalizedDecision = normalizePaymentReviewDecision(decision);
  if (!normalizedDecision) {
    return { ok: false, message: "Choose approve or reject for the payment review." };
  }

  await ensureDemoDatabaseSeed(client);
  const result = await client.$transaction(async (tx) => {
    const transaction = await tx.paymentTransaction.findUnique({
      where: { id: transactionId },
      include: { user: true },
    });
    if (!transaction) {
      return { ok: false, message: "Payment transaction was not found." };
    }
    if (transaction.status !== "PENDING_REVIEW") {
      return { ok: false, message: "Payment transaction has already been reviewed." };
    }

    const amount = toNumber(transaction.amount);
    const reviewNotes = String(notes || "").trim();
    const nextStatus = normalizedDecision === "approve" ? "COMPLETED" : "REJECTED";

    await tx.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: nextStatus,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes,
      },
    });

    if (normalizedDecision === "reject" && transaction.type === "WITHDRAWAL") {
      await tx.balanceAccount.upsert({
        where: { userId_currency: { userId: transaction.userId, currency: "WITHDRAWABLE" } },
        update: { balance: { increment: amount } },
        create: { userId: transaction.userId, currency: "WITHDRAWABLE", balance: amount },
      });

      await tx.ledgerEntry.create({
        data: {
          userId: transaction.userId,
          transactionType: "CREDIT",
          amount,
          currency: "WITHDRAWABLE",
          source: "REFUND",
          metadata: {
            note: `Withdrawal ${transaction.id} rejected during review; held funds returned.`,
            paymentTransactionId: transaction.id,
            reviewNotes,
          },
        },
      });
    }

    await tx.auditTrail.create({
      data: {
        actorId: reviewerId,
        action:
          normalizedDecision === "approve"
            ? "payment.withdrawal.approved"
            : "payment.withdrawal.rejected",
        metadata: {
          paymentTransactionId: transaction.id,
          userId: transaction.userId,
          amount,
          status: nextStatus,
          reviewNotes,
        },
      },
    });

    return {
      ok: true,
      message:
        normalizedDecision === "approve"
          ? "Withdrawal approved and marked complete."
          : "Withdrawal rejected and held funds returned.",
      userId: transaction.userId,
    };
  });

  return {
    ...result,
    state: result.ok ? await getDatabaseState(client, result.userId) : undefined,
  };
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
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: { verificationChecks: true },
    });
    if (!user) {
      return { ok: false, message: "User was not found." };
    }
    const compliance = evaluatePaymentCompliance({ user, action: "deposit", amount: depositAmount });
    if (!compliance.ok) {
      return {
        ok: false,
        message: compliance.blockingReasons.join(" "),
        compliance,
      };
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
          compliance,
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
          complianceMode: compliance.mode,
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
    const [user, account] = await Promise.all([
      tx.user.findUnique({
        where: { id: userId },
        include: { verificationChecks: true },
      }),
      tx.balanceAccount.findUnique({
        where: { userId_currency: { userId, currency: "WITHDRAWABLE" } },
      }),
    ]);
    if (!user) {
      return { ok: false, message: "User was not found." };
    }
    const compliance = evaluatePaymentCompliance({
      user,
      action: "withdrawal",
      amount: withdrawalAmount,
    });
    if (!compliance.ok) {
      return {
        ok: false,
        message: compliance.blockingReasons.join(" "),
        compliance,
      };
    }
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
          compliance,
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
          complianceMode: compliance.mode,
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
