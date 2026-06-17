import { hasDatabaseUrl, prisma } from "./prisma.js";

const STATUS_FROM_ACTION = {
  SUBMITTED: "UNDER_REVIEW",
  APPROVED: "PUBLISHED",
  REJECTED: "REJECTED",
  TAKEDOWN: "PAUSED",
  RESTORED: "PUBLISHED",
};

export async function recordModerationEvent({
  profileId,
  actorId = null,
  action,
  reason = null,
  metadata = null,
}) {
  if (!hasDatabaseUrl()) return { ok: true };
  const event = await prisma.listingModerationEvent.create({
    data: {
      profileId,
      actorId: actorId || undefined,
      action,
      reason: reason || undefined,
      metadata: metadata || undefined,
    },
  });
  const status = STATUS_FROM_ACTION[action];
  if (status) {
    await prisma.strategyMarketplaceProfile.update({
      where: { id: profileId },
      data: { status },
    }).catch(() => null);
  }
  return { ok: true, event };
}

export async function listModerationQueue() {
  if (!hasDatabaseUrl()) return [];
  return prisma.strategyMarketplaceProfile.findMany({
    where: { status: { in: ["UNDER_REVIEW", "REJECTED"] } },
    include: {
      creator: { select: { id: true, username: true, name: true } },
      moderationEvents: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
