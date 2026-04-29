import { createAdminAdjustmentEntry } from "../accounting.js";
import { defaultState } from "../defaultState.js";
import { getDatabaseState, ensureDemoDatabaseSeed, databaseMapping } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

function toNumber(value) {
  return Number(value ?? 0);
}

async function writeAdjustmentLedger(tx, entry) {
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
}

export async function freezeDatabaseUser({
  targetUserId,
  actorId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const target = await client.user.findUnique({ where: { id: targetUserId } });

  if (!target) {
    return { ok: false, message: "User was not found.", state: await getDatabaseState(client, actorId) };
  }

  const frozen = !target.frozen;
  await client.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: { frozen, riskStatus: frozen ? "frozen" : "review" },
    });
    await writeAdjustmentLedger(
      tx,
      createAdminAdjustmentEntry({
        userId: targetUserId,
        amount: 0,
        metadata: frozen ? "Account frozen for manual review" : "Account unfrozen after review",
      }),
    );
    await tx.riskReview.create({
      data: {
        userId: targetUserId,
        status: frozen ? "OPEN" : "CLEARED",
        score: target.riskScore,
        signals: [frozen ? "Manual freeze" : "Manual unfreeze"],
        notes: frozen ? "Account frozen for manual review" : "Account unfrozen after review",
      },
    });
    await tx.auditTrail.create({
      data: {
        actorId,
        action: frozen ? "user.frozen" : "user.unfrozen",
        metadata: { targetUserId },
      },
    });
  });

  return {
    ok: true,
    message: `${target.name} is now ${frozen ? "frozen" : "unfrozen"}.`,
    state: await getDatabaseState(client, actorId),
  };
}

export async function clearDatabaseRiskReview({
  targetUserId,
  actorId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const target = await client.user.findUnique({ where: { id: targetUserId } });

  if (!target) {
    return { ok: false, message: "User was not found.", state: await getDatabaseState(client, actorId) };
  }

  await client.$transaction([
    client.user.update({
      where: { id: targetUserId },
      data: { frozen: false, riskStatus: "clear", riskScore: Math.min(target.riskScore, 20) },
    }),
    client.riskReview.updateMany({
      where: { userId: targetUserId, status: "OPEN" },
      data: { status: "CLEARED", notes: "Manual review cleared" },
    }),
    client.auditTrail.create({
      data: {
        actorId,
        action: "risk.cleared",
        metadata: { targetUserId },
      },
    }),
  ]);

  return {
    ok: true,
    message: `${target.name} was cleared from the review queue.`,
    state: await getDatabaseState(client, actorId),
  };
}

export async function removeDatabaseUserBonus({
  targetUserId,
  actorId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const target = await client.user.findUnique({
    where: { id: targetUserId },
    include: { balanceAccounts: true },
  });

  if (!target) {
    return { ok: false, message: "User was not found.", state: await getDatabaseState(client, actorId) };
  }

  const bonusAccount = target.balanceAccounts.find((account) => account.currency === "BONUS");
  const amount = Math.min(10, toNumber(bonusAccount?.balance));

  if (amount <= 0) {
    return { ok: false, message: "No removable bonus balance was found.", state: await getDatabaseState(client, actorId) };
  }

  await client.$transaction(async (tx) => {
    await tx.balanceAccount.update({
      where: { userId_currency: { userId: targetUserId, currency: "BONUS" } },
      data: { balance: { decrement: amount } },
    });
    await writeAdjustmentLedger(
      tx,
      createAdminAdjustmentEntry({
        userId: targetUserId,
        amount,
        transactionType: "debit",
        metadata: "Promotional bonus removed during manual review",
      }),
    );
    const liability = await tx.adminConfig.findUnique({ where: { key: "bonusLiability" } });
    await tx.adminConfig.upsert({
      where: { key: "bonusLiability" },
      update: { value: Math.max(0, Number(liability?.value ?? 0) - amount) },
      create: { key: "bonusLiability", value: Math.max(0, defaultState.adminConfig.bonusLiability - amount) },
    });
    await tx.auditTrail.create({
      data: {
        actorId,
        action: "bonus.removed",
        metadata: { targetUserId, amount },
      },
    });
  });

  return {
    ok: true,
    message: `Removed $${amount.toFixed(2)} of bonus balance from ${target.name}.`,
    state: await getDatabaseState(client, actorId),
  };
}
