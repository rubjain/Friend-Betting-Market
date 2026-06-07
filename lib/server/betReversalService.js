import { prisma } from "./prisma.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";

function toNumber(value) {
  return Number(value ?? 0);
}

export async function reverseDatabaseBet({ betId, actorId, reason, client = prisma }) {
  await ensureDemoDatabaseSeed(client);
  const bet = await client.bet.findUnique({
    where: { id: betId },
    include: { market: true },
  });
  if (!bet) return { ok: false, message: "Bet not found." };
  if (bet.status === "VOIDED") return { ok: false, message: "Bet is already voided." };

  const currency = bet.isPaper ? "PAPER" : "WITHDRAWABLE";
  const refundAmount = toNumber(bet.stake);

  await client.$transaction(async (tx) => {
    const account = await tx.balanceAccount.findUnique({
      where: { userId_currency: { userId: bet.userId, currency } },
    });
    if (account) {
      await tx.balanceAccount.update({
        where: { userId_currency: { userId: bet.userId, currency } },
        data: { balance: { increment: refundAmount } },
      });
    }

    await tx.bet.update({
      where: { id: betId },
      data: { status: "VOIDED" },
    });

    await tx.ledgerEntry.create({
      data: {
        userId: bet.userId,
        marketId: bet.marketId,
        transactionType: "CREDIT",
        amount: refundAmount,
        currency,
        source: "ADMIN_ADJUSTMENT",
        metadata: {
          note: `Bet reversed by admin: ${reason || "Manual reversal"}`,
          betId,
          actorId,
        },
      },
    });

    await tx.auditTrail.create({
      data: {
        actorId,
        action: "bet.reversed",
        metadata: { betId, userId: bet.userId, reason: reason || null },
      },
    });
  });

  return {
    ok: true,
    message: "Bet reversed and stake refunded.",
    state: await getDatabaseState(client, bet.userId),
  };
}
