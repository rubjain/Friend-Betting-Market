import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { prisma, hasDatabaseUrl } from "../../../../lib/server/prisma.js";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.authenticated) return NextResponse.json({ ok: true, markets: [] });
    if (!hasDatabaseUrl()) return NextResponse.json({ ok: true, markets: [] });

    const userId = session.userId;

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: {
        requesterId: true,
        addresseeId: true,
        requester: { select: { id: true, name: true, username: true } },
        addressee: { select: { id: true, name: true, username: true } },
      },
    });

    const friends = friendships.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester,
    );
    const friendIds = friends.map((f) => f.id);

    if (!friendIds.length) return NextResponse.json({ ok: true, markets: [] });

    const [friendBets, myBets] = await Promise.all([
      prisma.bet.findMany({
        where: { userId: { in: friendIds }, status: "OPEN", isPaper: false },
        select: {
          userId: true,
          marketId: true,
          side: true,
          stake: true,
          market: {
            select: {
              id: true,
              title: true,
              category: true,
              yesPrice: true,
              noPrice: true,
              volume: true,
              closeAt: true,
              status: true,
            },
          },
        },
      }),
      prisma.bet.findMany({
        where: { userId, status: "OPEN" },
        select: { marketId: true, side: true },
      }),
    ]);

    const myBetMap = Object.fromEntries(myBets.map((b) => [b.marketId, b.side]));
    const marketMap = new Map();

    for (const bet of friendBets) {
      if (bet.market.status !== "ACTIVE") continue;

      if (!marketMap.has(bet.marketId)) {
        marketMap.set(bet.marketId, {
          id: bet.market.id,
          title: bet.market.title,
          category: bet.market.category,
          yesPrice: Number(bet.market.yesPrice),
          noPrice: Number(bet.market.noPrice),
          volume: Number(bet.market.volume),
          closeAt: bet.market.closeAt?.toISOString() ?? null,
          friends: [],
          myBet: myBetMap[bet.marketId] ?? null,
        });
      }

      const friend = friends.find((f) => f.id === bet.userId);
      if (friend) {
        const entry = marketMap.get(bet.marketId);
        // Deduplicate — one entry per friend per market
        if (!entry.friends.find((f) => f.id === friend.id)) {
          entry.friends.push({
            id: friend.id,
            name: friend.name,
            username: friend.username,
            side: bet.side,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      // Sort by most friends active, then by volume
      markets: Array.from(marketMap.values()).sort(
        (a, b) => b.friends.length - a.friends.length || b.volume - a.volume,
      ),
    });
  } catch (err) {
    console.error("shared-markets error:", err);
    return NextResponse.json({ ok: true, markets: [] });
  }
}
