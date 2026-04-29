import { defaultState } from "../defaultState.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";
import { getDemoState } from "./demoStore.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

export async function submitDatabaseDispute({
  marketId,
  betId,
  reason,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  const cleanedReason = String(reason || "").trim();

  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);

  if (cleanedReason.length < 12) {
    return {
      ok: false,
      message: "Add a short reason so the dispute can be reviewed.",
      state: await getDatabaseState(client, userId),
    };
  }

  const market = await client.market.findUnique({ where: { id: marketId } });
  if (!market || !["RESOLVED", "VOIDED", "DISPUTED"].includes(market.status)) {
    return {
      ok: false,
      message: "Only resolved or voided markets can be disputed.",
      state: await getDatabaseState(client, userId),
    };
  }

  const bet = betId
    ? await client.bet.findFirst({ where: { id: betId, userId, marketId } })
    : null;

  if (betId && !bet) {
    return {
      ok: false,
      message: "The disputed bet was not found.",
      state: await getDatabaseState(client, userId),
    };
  }

  await client.$transaction([
    client.marketDispute.create({
      data: {
        userId,
        marketId,
        betId: bet?.id,
        reason: cleanedReason,
      },
    }),
    client.market.update({
      where: { id: marketId },
      data: { status: "DISPUTED" },
    }),
    client.marketResolution.upsert({
      where: { marketId },
      update: { status: "DISPUTED" },
      create: {
        marketId,
        status: "DISPUTED",
        notes: "Dispute opened before final operational review.",
      },
    }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        marketId,
        action: "dispute.opened",
        metadata: { betId: bet?.id ?? null, reason: cleanedReason },
      },
    }),
  ]);

  return {
    ok: true,
    message: `Dispute opened for "${market.title}".`,
    state: await getDatabaseState(client, userId),
  };
}

export async function submitDispute({ marketId, betId, reason, userId }) {
  if (!hasDatabaseUrl()) {
    return {
      ok: true,
      message: "Dispute captured for demo review.",
      state: getDemoState(),
    };
  }

  return submitDatabaseDispute({ marketId, betId, reason, userId });
}

export async function updateDatabaseDispute({
  disputeId,
  status,
  note,
  actorId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return {
      ok: true,
      message: "Dispute review updated for demo.",
    };
  }

  await ensureDemoDatabaseSeed(client);
  const normalized = String(status || "").toUpperCase();
  const allowed = new Set(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]);

  if (!allowed.has(normalized)) {
    return { ok: false, message: "Dispute status is not allowed." };
  }

  const dispute = await client.marketDispute.findUnique({
    where: { id: disputeId },
    include: { market: true },
  });

  if (!dispute) {
    return { ok: false, message: "Dispute was not found." };
  }

  await client.$transaction([
    client.marketDispute.update({
      where: { id: disputeId },
      data: { status: normalized },
    }),
    client.market.update({
      where: { id: dispute.marketId },
      data: { status: normalized === "RESOLVED" || normalized === "REJECTED" ? "RESOLVED" : "DISPUTED" },
    }),
    client.marketResolution.upsert({
      where: { marketId: dispute.marketId },
      update: {
        status: normalized === "RESOLVED" || normalized === "REJECTED" ? "FINAL" : "DISPUTED",
        notes: note?.trim() || dispute.market.resolutionTemplate,
      },
      create: {
        marketId: dispute.marketId,
        status: normalized === "RESOLVED" || normalized === "REJECTED" ? "FINAL" : "DISPUTED",
        notes: note?.trim() || "Dispute reviewed by admin.",
      },
    }),
    client.auditTrail.create({
      data: {
        actorId,
        marketId: dispute.marketId,
        action: "dispute.updated",
        metadata: {
          disputeId,
          status: normalized,
          note: note?.trim() || "",
        },
      },
    }),
  ]);

  return {
    ok: true,
    message: `Dispute for "${dispute.market.title}" is now ${normalized.toLowerCase().replace("_", " ")}.`,
  };
}
