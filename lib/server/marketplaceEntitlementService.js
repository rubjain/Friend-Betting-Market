import { hasDatabaseUrl, prisma } from "./prisma.js";

export async function grantEntitlement({
  userId,
  profileId,
  billingSubscriptionId = null,
  startsAt = new Date(),
  endsAt = null,
  graceEndsAt = null,
  status = "ACTIVE",
  source = "billing",
  reason = null,
  metadata = null,
}) {
  if (!hasDatabaseUrl()) return { ok: true, entitlement: { id: "demo-entitlement", status } };
  const entitlement = await prisma.marketplaceEntitlement.create({
    data: {
      userId,
      profileId,
      billingSubscriptionId,
      startsAt,
      endsAt,
      graceEndsAt,
      status,
      source,
      reason: reason || undefined,
      metadata: metadata || undefined,
    },
  });
  return { ok: true, entitlement };
}

export async function revokeEntitlements({ userId, profileId, reason = "MANUAL_REVOKE" }) {
  if (!hasDatabaseUrl()) return { ok: true, count: 0 };
  const updated = await prisma.marketplaceEntitlement.updateMany({
    where: {
      userId,
      profileId,
      status: { in: ["ACTIVE", "GRACE"] },
    },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      reason,
    },
  });
  return { ok: true, count: updated.count };
}

export async function hasMarketplaceEntitlement({ userId, profileId, now = new Date() }) {
  if (!hasDatabaseUrl()) return true;
  const where = entitlementWhereClause({ userId, profileId, now });
  const entitlement = await prisma.marketplaceEntitlement.findFirst({
    where,
    orderBy: { createdAt: "desc" },
  });
  return Boolean(entitlement);
}

export function entitlementWhereClause({ userId, profileId, now }) {
  return {
    userId,
    profileId,
    startsAt: { lte: now },
    OR: [
      {
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      {
        status: "GRACE",
        graceEndsAt: { gt: now },
      },
    ],
  };
}

export async function listEntitlementsForUser({ userId }) {
  if (!hasDatabaseUrl()) return [];
  return prisma.marketplaceEntitlement.findMany({
    where: { userId },
    include: { profile: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
  });
}
