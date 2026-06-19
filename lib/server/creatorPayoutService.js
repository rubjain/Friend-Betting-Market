import { hasDatabaseUrl, prisma } from "./prisma.js";

const DEFAULT_PLATFORM_FEE_BPS = 1500;

function computeFeeCents(grossCents, feeBps = DEFAULT_PLATFORM_FEE_BPS) {
  return Math.round((Math.max(0, grossCents) * Math.max(0, feeBps)) / 10000);
}

export async function appendCreatorRevenueEvent({
  profileId,
  actorId = null,
  amountCents,
  type = "INVOICE_PAID",
  metadata = null,
}) {
  if (!hasDatabaseUrl()) return { ok: true };
  const event = await prisma.creatorPayoutLedgerEvent.create({
    data: {
      profileId,
      actorId: actorId || undefined,
      amountCents: Math.round(Number(amountCents) || 0),
      type,
      metadata: metadata || undefined,
    },
  });
  return { ok: true, event };
}

export async function summarizeCreatorRevenue({ creatorId, periodStart, periodEnd }) {
  if (!hasDatabaseUrl()) return { grossCents: 0, feeCents: 0, netCents: 0, events: [] };
  const events = await prisma.creatorPayoutLedgerEvent.findMany({
    where: {
      profile: { creatorId },
      createdAt: { gte: periodStart, lt: periodEnd },
    },
    orderBy: { createdAt: "asc" },
  });
  const grossCents = events.reduce((sum, event) => sum + (Number(event.amountCents) || 0), 0);
  const feeCents = computeFeeCents(grossCents);
  return { grossCents, feeCents, netCents: grossCents - feeCents, events };
}

export async function createCreatorPayoutSnapshot({ creatorId, periodStart, periodEnd }) {
  if (!hasDatabaseUrl()) return { ok: true, payout: null };
  const summary = await summarizeCreatorRevenue({ creatorId, periodStart, periodEnd });
  const payout = await prisma.creatorPayout.create({
    data: {
      creatorId,
      periodStart,
      periodEnd,
      grossCents: summary.grossCents,
      feeCents: summary.feeCents,
      netCents: summary.netCents,
      status: "READY",
    },
  });
  return { ok: true, payout };
}

export async function updateCreatorPayoutStatus({
  payoutId,
  status,
  providerRef = null,
  actorId = null,
  note = null,
}) {
  const nextStatus = String(status || "").toUpperCase();
  const allowed = new Set(["READY", "PAID", "HELD", "CANCELED"]);
  if (!allowed.has(nextStatus)) {
    return { ok: false, message: "Invalid payout status." };
  }
  if (!hasDatabaseUrl()) return { ok: true, payout: null };

  const payout = await prisma.creatorPayout.update({
    where: { id: payoutId },
    data: {
      status: nextStatus,
      providerRef: providerRef || undefined,
      paidAt: nextStatus === "PAID" ? new Date() : null,
      metadata: {
        lastUpdatedBy: actorId,
        lastUpdatedAt: new Date().toISOString(),
        note: note || null,
      },
    },
  });

  await prisma.auditTrail.create({
    data: {
      actorId: actorId || undefined,
      action: "creator_payout.status_updated",
      metadata: {
        payoutId,
        status: nextStatus,
        providerRef: providerRef || null,
        note: note || null,
      },
    },
  });

  return { ok: true, payout };
}

export async function listPayoutReconciliationQueue({ take = 100 } = {}) {
  if (!hasDatabaseUrl()) return { ok: true, payouts: [], failedInvoices: [] };
  const payouts = await prisma.creatorPayout.findMany({
    where: { status: { in: ["PENDING", "HELD"] } },
    orderBy: [{ status: "asc" }, { periodEnd: "desc" }],
    take: Math.min(Math.max(Number(take) || 100, 1), 500),
    include: {
      creator: { select: { id: true, username: true, email: true } },
    },
  });
  const failedInvoices = await prisma.marketplaceInvoice.findMany({
    where: { status: "FAILED" },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Math.max(Number(take) || 100, 1), 500),
    include: {
      user: { select: { id: true, username: true, email: true } },
      profile: { select: { id: true, slug: true, name: true } },
    },
  });
  return { ok: true, payouts, failedInvoices };
}
