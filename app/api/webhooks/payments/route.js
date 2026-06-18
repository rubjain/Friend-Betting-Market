import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { hasDatabaseUrl, prisma } from "../../../../lib/server/prisma.js";
import { getStripeClient, isStripeEnabled, stripeWebhookSecret } from "../../../../lib/server/stripe.js";
import { ensureDemoDatabaseSeed, getDatabaseState, databaseMapping } from "../../../../lib/server/dbState.js";
import { createFundsCreditEntry } from "../../../../lib/accounting.js";
import {
  createInvoice,
  upsertBillingSubscription,
} from "../../../../lib/server/marketplaceBillingService.js";
import {
  grantEntitlement,
  revokeEntitlements,
} from "../../../../lib/server/marketplaceEntitlementService.js";
import { recordInvoiceRevenue } from "../../../../lib/server/strategyMarketplaceService.js";

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
  const eventId = event?.id || null;

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
    if (transaction.providerRef && transaction.providerRef === providerRef) {
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
          metadata: { paymentTransactionId: transaction.id, provider: "stripe", providerRef, stripeEventId: eventId },
        },
      });
    });

    return NextResponse.json({ ok: true, state: await getDatabaseState(prisma, userId) }, { status: 200 });
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    const userId = invoice?.metadata?.userId;
    const profileId = invoice?.metadata?.profileId;
    const planId = invoice?.metadata?.planId;
    if (!userId || !profileId || !planId) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }
    const amountPaidCents = Number(invoice?.amount_paid || 0);
    const stripeInvoiceId = invoice?.id || null;
    if (stripeInvoiceId) {
      const existingPaidInvoice = await prisma.marketplaceInvoice.findFirst({
        where: { providerInvoiceId: stripeInvoiceId, status: "PAID" },
        select: { id: true },
      });
      if (existingPaidInvoice) {
        return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
      }
    }
    const periodStart = invoice?.period_start ? new Date(invoice.period_start * 1000) : new Date();
    const periodEnd = invoice?.period_end ? new Date(invoice.period_end * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sub = await upsertBillingSubscription({
      userId,
      profileId,
      planId,
      status: "ACTIVE",
      providerSubscriptionId: invoice?.subscription || null,
      providerCustomerId: invoice?.customer || null,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      metadata: { webhookType: event.type },
    });
    const created = await createInvoice({
      userId,
      profileId,
      billingSubscriptionId: sub.subscription.id,
      provider: "stripe",
      providerInvoiceId: stripeInvoiceId,
      status: "PAID",
      amountDueCents: Number(invoice?.amount_due || amountPaidCents),
      amountPaidCents,
      paidAt: new Date(),
      metadata: { webhookType: event.type, stripeEventId: eventId },
    });
    await grantEntitlement({
      userId,
      profileId,
      billingSubscriptionId: sub.subscription.id,
      startsAt: periodStart,
      endsAt: periodEnd,
      status: "ACTIVE",
      reason: "Invoice paid",
      metadata: { stripeInvoiceId, stripeEventId: eventId },
    });
    await recordInvoiceRevenue({
      profileId,
      actorId: userId,
      amountCents: amountPaidCents,
      invoiceId: created.invoice?.id || null,
      billingSubscriptionId: sub.subscription.id,
    }).catch(() => {});
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object;
    const userId = invoice?.metadata?.userId;
    const profileId = invoice?.metadata?.profileId;
    const planId = invoice?.metadata?.planId;
    if (!userId || !profileId || !planId) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }
    const stripeInvoiceId = invoice?.id || null;
    if (stripeInvoiceId) {
      const existingFailedInvoice = await prisma.marketplaceInvoice.findFirst({
        where: { providerInvoiceId: stripeInvoiceId, status: "FAILED" },
        select: { id: true },
      });
      if (existingFailedInvoice) {
        return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
      }
    }
    const graceEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const sub = await upsertBillingSubscription({
      userId,
      profileId,
      planId,
      status: "PAST_DUE",
      providerSubscriptionId: invoice?.subscription || null,
      providerCustomerId: invoice?.customer || null,
      metadata: { webhookType: event.type, failureCode: invoice?.last_finalization_error?.code || null },
    });
    await createInvoice({
      userId,
      profileId,
      billingSubscriptionId: sub.subscription.id,
      provider: "stripe",
      providerInvoiceId: stripeInvoiceId,
      status: "FAILED",
      amountDueCents: Number(invoice?.amount_due || 0),
      amountPaidCents: Number(invoice?.amount_paid || 0),
      dueAt: invoice?.due_date ? new Date(invoice.due_date * 1000) : null,
      failureCode: invoice?.last_finalization_error?.code || "payment_failed",
      failureMessage: invoice?.last_finalization_error?.message || "Invoice payment failed",
      metadata: { webhookType: event.type, stripeEventId: eventId, graceEndsAt: graceEndsAt.toISOString() },
    });
    await grantEntitlement({
      userId,
      profileId,
      billingSubscriptionId: sub.subscription.id,
      status: "GRACE",
      startsAt: new Date(),
      graceEndsAt,
      endsAt: graceEndsAt,
      reason: "Invoice payment failed - grace period started",
      metadata: { stripeInvoiceId, stripeEventId: eventId },
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const userId = subscription?.metadata?.userId;
    const profileId = subscription?.metadata?.profileId;
    const planId = subscription?.metadata?.planId;
    if (!userId || !profileId || !planId) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }
    const canceled = event.type === "customer.subscription.deleted" || subscription?.status === "canceled";
    const status = canceled ? "CANCELED" : String(subscription?.status || "ACTIVE").toUpperCase();
    await upsertBillingSubscription({
      userId,
      profileId,
      planId,
      status: ["ACTIVE", "TRIALING", "PAST_DUE", "PAUSED", "CANCELED"].includes(status) ? status : "ACTIVE",
      providerSubscriptionId: subscription?.id || null,
      providerCustomerId: subscription?.customer || null,
      currentPeriodStart: subscription?.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
      currentPeriodEnd: subscription?.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
      metadata: { webhookType: event.type },
    });
    if (canceled) {
      await revokeEntitlements({ userId, profileId, reason: "Stripe subscription canceled" });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (event.type === "payout.paid" || event.type === "payout.failed") {
    const payout = event.data.object;
    const payoutId = payout?.id || "";
    const paymentTransactionId = payout?.metadata?.paymentTransactionId || "";
    if (!payoutId || !paymentTransactionId) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    const transaction = await prisma.paymentTransaction.findUnique({ where: { id: paymentTransactionId } });
    if (!transaction) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    if (event.type === "payout.paid") {
      if (["COMPLETED", "REJECTED", "CANCELED"].includes(transaction.status)) {
        return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
      }
      await prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "COMPLETED",
          provider: "stripe",
          providerRef: payoutId,
          metadata: {
            ...(transaction.metadata || {}),
            payoutPaidStripeEventId: eventId,
          },
        },
      });

      await prisma.auditTrail.create({
        data: {
          actorId: transaction.reviewedById || transaction.userId,
          action: "payment.withdrawal.completed",
          metadata: { paymentTransactionId: transaction.id, payoutId, stripeEventId: eventId },
        },
      });

      return NextResponse.json({ ok: true, state: await getDatabaseState(prisma, transaction.userId) });
    }

    if (["REJECTED", "COMPLETED", "CANCELED"].includes(transaction.status)) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    // payout.failed: return held funds
    const amount = Number(transaction.amount);
    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "REJECTED",
          provider: "stripe",
          providerRef: payoutId,
          metadata: {
            ...(transaction.metadata || {}),
            note: "Stripe payout failed; held funds returned.",
            payoutFailure: payout?.failure_message || payout?.failure_code || "unknown",
          },
        },
      });

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
            note: `Stripe payout failed for withdrawal ${transaction.id}; held funds returned.`,
            paymentTransactionId: transaction.id,
            payoutId,
          },
        },
      });

      await tx.auditTrail.create({
        data: {
          actorId: transaction.reviewedById || transaction.userId,
          action: "payment.withdrawal.failed",
          metadata: { paymentTransactionId: transaction.id, payoutId },
        },
      });
    });

    return NextResponse.json({ ok: true, state: await getDatabaseState(prisma, transaction.userId) });
  }

  // Acknowledge all other event types for now.
  return NextResponse.json({ ok: true, type: event.type }, { status: 200 });
}

