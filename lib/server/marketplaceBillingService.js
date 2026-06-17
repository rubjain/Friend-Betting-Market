import { hasDatabaseUrl, prisma } from "./prisma.js";

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function moneyCents(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function normalizeBillingSubscription(record) {
  if (!record) return null;
  return {
    id: record.id,
    userId: record.userId,
    profileId: record.profileId,
    planId: record.planId,
    status: record.status,
    provider: record.provider,
    providerCustomerId: record.providerCustomerId,
    providerSubscriptionId: record.providerSubscriptionId,
    currentPeriodStart: record.currentPeriodStart?.toISOString?.() || null,
    currentPeriodEnd: record.currentPeriodEnd?.toISOString?.() || null,
    canceledAt: record.canceledAt?.toISOString?.() || null,
    endedAt: record.endedAt?.toISOString?.() || null,
    createdAt: record.createdAt?.toISOString?.() || null,
    updatedAt: record.updatedAt?.toISOString?.() || null,
  };
}

export async function getOrCreateMarketplacePlan({ profileId, amountCents, interval = "MONTH", name = "Default plan" }) {
  if (!hasDatabaseUrl()) {
    return { ok: true, plan: { id: "demo-plan", profileId, amountCents: moneyCents(amountCents), interval } };
  }

  const existing = await prisma.marketplaceBillingPlan.findFirst({
    where: { profileId, active: true, amountCents: moneyCents(amountCents), interval },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { ok: true, plan: existing };
  const created = await prisma.marketplaceBillingPlan.create({
    data: { profileId, amountCents: moneyCents(amountCents), interval, name, active: true },
  });
  return { ok: true, plan: created };
}

export async function upsertBillingSubscription({
  userId,
  profileId,
  planId,
  status = "ACTIVE",
  provider = "stripe",
  providerSubscriptionId = null,
  providerCustomerId = null,
  providerCheckoutSessionId = null,
  currentPeriodStart = null,
  currentPeriodEnd = null,
  metadata = null,
}) {
  if (!hasDatabaseUrl()) {
    return {
      ok: true,
      subscription: normalizeBillingSubscription({
        id: "demo-subscription",
        userId,
        profileId,
        planId,
        status,
        provider,
        providerSubscriptionId,
        providerCustomerId,
        currentPeriodStart: toDate(currentPeriodStart),
        currentPeriodEnd: toDate(currentPeriodEnd),
        canceledAt: null,
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };
  }

  const record = await prisma.billingSubscription.upsert({
    where: { userId_profileId: { userId, profileId } },
    create: {
      userId,
      profileId,
      planId,
      status,
      provider,
      providerSubscriptionId,
      providerCustomerId,
      providerCheckoutSessionId,
      currentPeriodStart: toDate(currentPeriodStart),
      currentPeriodEnd: toDate(currentPeriodEnd),
      metadata: metadata || undefined,
    },
    update: {
      planId,
      status,
      provider,
      providerSubscriptionId: providerSubscriptionId || undefined,
      providerCustomerId: providerCustomerId || undefined,
      providerCheckoutSessionId: providerCheckoutSessionId || undefined,
      currentPeriodStart: toDate(currentPeriodStart),
      currentPeriodEnd: toDate(currentPeriodEnd),
      canceledAt: status === "CANCELED" ? new Date() : null,
      endedAt: ["CANCELED", "EXPIRED"].includes(status) ? new Date() : null,
      metadata: metadata || undefined,
    },
  });
  return { ok: true, subscription: normalizeBillingSubscription(record) };
}

export async function createInvoice({
  userId,
  profileId,
  billingSubscriptionId,
  provider = "stripe",
  providerInvoiceId = null,
  amountDueCents = 0,
  amountPaidCents = 0,
  status = "OPEN",
  dueAt = null,
  paidAt = null,
  failureCode = null,
  failureMessage = null,
  metadata = null,
}) {
  if (!hasDatabaseUrl()) {
    return { ok: true, invoice: { id: "demo-invoice", status, amountDueCents: moneyCents(amountDueCents) } };
  }
  const data = {
    userId,
    profileId,
    billingSubscriptionId,
    provider,
    providerInvoiceId: providerInvoiceId || undefined,
    amountDueCents: moneyCents(amountDueCents),
    amountPaidCents: moneyCents(amountPaidCents),
    status,
    dueAt: toDate(dueAt),
    paidAt: toDate(paidAt),
    failureCode: failureCode || undefined,
    failureMessage: failureMessage || undefined,
    metadata: metadata || undefined,
  };

  const invoice = providerInvoiceId
    ? await prisma.marketplaceInvoice.upsert({
      where: { providerInvoiceId },
      create: data,
      update: {
        userId,
        profileId,
        billingSubscriptionId,
        provider,
        amountDueCents: data.amountDueCents,
        amountPaidCents: data.amountPaidCents,
        status,
        dueAt: data.dueAt,
        paidAt: data.paidAt,
        failureCode: data.failureCode,
        failureMessage: data.failureMessage,
        metadata: data.metadata,
      },
    })
    : await prisma.marketplaceInvoice.create({ data });

  return { ok: true, invoice };
}

export async function listSubscriptionInvoices({ userId, profileId }) {
  if (!hasDatabaseUrl()) return [];
  return prisma.marketplaceInvoice.findMany({
    where: { userId, ...(profileId ? { profileId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
