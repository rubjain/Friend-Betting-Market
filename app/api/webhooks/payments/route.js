import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { hasDatabaseUrl, prisma } from "../../../../lib/server/prisma.js";
import { getStripeClient, isStripeEnabled, stripeWebhookSecret } from "../../../../lib/server/stripe.js";
import { ensureDemoDatabaseSeed, getDatabaseState, databaseMapping } from "../../../../lib/server/dbState.js";
import { createFundsCreditEntry } from "../../../../lib/accounting.js";

export async function POST(request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: false, message: "DATABASE_URL is required." }, { status: 503 });
  }
  if (!isStripeEnabled() || !stripeWebhookSecret()) {
    return NextResponse.json(
      { ok: false, message: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = (await headers()).get("stripe-signature") || "";
  const stripe = getStripeClient();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret());
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  await ensureDemoDatabaseSeed(prisma);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const paymentTransactionId = session?.metadata?.paymentTransactionId || session?.client_reference_id || "";
    const providerRef = session?.id || "";

    if (!paymentTransactionId) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    const transaction = await prisma.paymentTransaction.findUnique({ where: { id: paymentTransactionId } });
    if (!transaction) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    if (transaction.status === "COMPLETED") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const amount = Number(transaction.amount);
    const userId = transaction.userId;

    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: "COMPLETED", provider: "stripe", providerRef },
      });

      await tx.balanceAccount.upsert({
        where: { userId_currency: { userId, currency: "WITHDRAWABLE" } },
        update: { balance: { increment: amount } },
        create: { userId, currency: "WITHDRAWABLE", balance: amount },
      });

      const entry = createFundsCreditEntry({
        userId,
        amount,
        currencyType: "withdrawable",
        source: "deposit",
        metadata: `Stripe deposit completed; payment transaction ${transaction.id}`,
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
          metadata: { paymentTransactionId: transaction.id, provider: "stripe", providerRef },
        },
      });
    });

    return NextResponse.json({ ok: true, state: await getDatabaseState(prisma, userId) }, { status: 200 });
  }

  // Acknowledge all other event types for now.
  return NextResponse.json({ ok: true, type: event.type }, { status: 200 });
}

