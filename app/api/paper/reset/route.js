import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { hasDatabaseUrl, prisma } from "../../../../lib/server/prisma.js";
import { getDatabaseState } from "../../../../lib/server/dbState.js";

const PAPER_STARTING_BALANCE = 10000;

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }

  const userId = session.userId;

  if (!hasDatabaseUrl()) {
    return NextResponse.json({
      ok: true,
      message: `Paper balance reset to $${PAPER_STARTING_BALANCE.toLocaleString()}.`,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.balanceAccount.upsert({
      where: { userId_currency: { userId, currency: "PAPER" } },
      update: { balance: PAPER_STARTING_BALANCE },
      create: { userId, currency: "PAPER", balance: PAPER_STARTING_BALANCE },
    });

    await tx.bet.updateMany({
      where: { userId, isPaper: true, status: "OPEN" },
      data: { status: "VOIDED" },
    });

    await tx.ledgerEntry.create({
      data: {
        userId,
        transactionType: "CREDIT",
        amount: PAPER_STARTING_BALANCE,
        currency: "PAPER",
        source: "ADMIN_ADJUSTMENT",
        metadata: { note: "Paper balance reset" },
      },
    });
  });

  const state = await getDatabaseState(prisma, userId);
  return NextResponse.json({
    ok: true,
    message: `Paper balance reset to $${PAPER_STARTING_BALANCE.toLocaleString()}.`,
    state,
  });
}
