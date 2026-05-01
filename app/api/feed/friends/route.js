import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { hasDatabaseUrl, prisma } from "../../../../lib/server/prisma.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  const userId = session.userId;

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId
  );

  if (friendIds.length === 0) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const bets = await prisma.bet.findMany({
    where: {
      userId: { in: friendIds },
      placedAt: { gte: since },
    },
    orderBy: { placedAt: "desc" },
    take: 20,
    select: {
      id: true,
      side: true,
      placedAt: true,
      user: { select: { name: true, username: true } },
      market: { select: { id: true, title: true } },
    },
  });

  const items = bets.map((bet) => ({
    id: bet.id,
    friendName: bet.user.name,
    friendUsername: bet.user.username,
    side: bet.side,
    marketId: bet.market.id,
    marketTitle: bet.market.title,
    placedAt: bet.placedAt.toISOString(),
  }));

  return NextResponse.json({ ok: true, items });
}
