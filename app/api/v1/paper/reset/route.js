import { NextResponse } from "next/server";
import { resolvePublicApiCaller, requireApiKeyScopes } from "../../../../lib/server/auth.js";
import { hasDatabaseUrl, prisma } from "../../../../lib/server/prisma.js";
import { getDatabaseState } from "../../../../lib/server/dbState.js";
import { resetPaperBalanceForDemoUser } from "../../../../lib/server/demoStore.js";

const PAPER_STARTING_BALANCE = 10000;

export async function POST(request) {
  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) return caller.response;

  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "trade:paper");
  if (!scopeCheck.ok) return scopeCheck.response;

  const userId = caller.userId;

  if (!hasDatabaseUrl()) {
    const state = resetPaperBalanceForDemoUser(userId, PAPER_STARTING_BALANCE);
    return NextResponse.json({
      ok: true,
      message: `Paper balance reset to $${PAPER_STARTING_BALANCE.toLocaleString()}.`,
      state,
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

    await tx.order.updateMany({
      where: { userId, isPaper: true, status: { in: ["OPEN", "PARTIAL"] } },
      data: { status: "CANCELED" },
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

