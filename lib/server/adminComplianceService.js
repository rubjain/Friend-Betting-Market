import { prisma } from "./prisma.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";

export async function adminUpdateVerification({
  targetUserId,
  type,
  status,
  actorId,
  note,
  client = prisma,
}) {
  await ensureDemoDatabaseSeed(client);
  const normalized = String(type || "").toUpperCase();
  const allowed = new Set(["EMAIL", "PHONE", "IDENTITY", "PAYMENT", "DEVICE", "LOCATION", "AGE", "SANCTIONS"]);
  const allowedStatus = new Set(["PENDING", "VERIFIED", "PLACEHOLDER", "FAILED", "REQUIRED"]);

  if (!allowed.has(normalized)) {
    return { ok: false, message: "Verification type was not recognized." };
  }
  if (!allowedStatus.has(String(status || "").toUpperCase())) {
    return { ok: false, message: "Verification status was not recognized." };
  }

  const dbStatus = String(status).toUpperCase();
  await client.$transaction([
    client.verificationCheck.upsert({
      where: { userId_type: { userId: targetUserId, type: normalized } },
      update: {
        status: dbStatus,
        provider: "admin-override",
        metadata: { note: note || null, updatedBy: actorId, updatedAt: new Date().toISOString() },
      },
      create: {
        userId: targetUserId,
        type: normalized,
        status: dbStatus,
        provider: "admin-override",
        metadata: { note: note || null, updatedBy: actorId, updatedAt: new Date().toISOString() },
      },
    }),
    client.auditTrail.create({
      data: {
        actorId,
        action: "verification.admin_override",
        metadata: { targetUserId, type: normalized, status: dbStatus, note: note || null },
      },
    }),
  ]);

  return {
    ok: true,
    message: `${normalized} verification set to ${dbStatus}.`,
    state: await getDatabaseState(client, targetUserId),
  };
}

export async function exportAuditTrail({ limit = 500, client = prisma }) {
  const rows = await client.auditTrail.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(Number(limit) || 500, 1), 5000),
    include: { actor: { select: { id: true, email: true, username: true } } },
  });

  return {
    ok: true,
    exportedAt: new Date().toISOString(),
    count: rows.length,
    entries: rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actorId,
      actorEmail: row.actor?.email ?? null,
      actorUsername: row.actor?.username ?? null,
      marketId: row.marketId,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
