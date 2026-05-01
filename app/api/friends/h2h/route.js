import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { hasDatabaseUrl, prisma } from "../../../../lib/server/prisma.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  const userId = session.userId;
  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get("friendId");

  if (!friendId) {
    return NextResponse.json({ ok: false, message: "friendId is required" }, { status: 400 });
  }

  if (!hasDatabaseUrl()) {
    return NextResponse.json({
      ok: true,
      record: { wins: 0, losses: 0, pushes: 0 },
      netAmount: 0,
      recentMatchups: [],
    });
  }

  const [myBets, friendBets] = await Promise.all([
    prisma.bet.findMany({
      where: { userId },
      select: {
        id: true,
        marketId: true,
        side: true,
        status: true,
        stake: true,
        expectedMultiplier: true,
        placedAt: true,
        market: { select: { id: true, title: true } },
      },
    }),
    prisma.bet.findMany({
      where: { userId: friendId },
      select: { marketId: true, side: true, status: true },
    }),
  ]);

  const myBetsByMarket = new Map(myBets.map((b) => [b.marketId, b]));
  const friendBetsByMarket = new Map(friendBets.map((b) => [b.marketId, b]));

  const matchups = [...myBetsByMarket.keys()]
    .filter((id) => friendBetsByMarket.has(id))
    .map((marketId) => {
      const mine = myBetsByMarket.get(marketId);
      const theirs = friendBetsByMarket.get(marketId);
      if (mine.side === theirs.side) return null;
      return { mine, theirs, marketId, title: mine.market.title, placedAt: mine.placedAt };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));

  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let netAmount = 0;

  for (const { mine } of matchups) {
    if (mine.status === "WON") {
      wins++;
      netAmount += Number(mine.stake) * (Number(mine.expectedMultiplier) - 1);
    } else if (mine.status === "LOST") {
      losses++;
      netAmount -= Number(mine.stake);
    } else {
      pushes++;
    }
  }

  const recentMatchups = matchups.slice(0, 5).map(({ mine, theirs, marketId, title, placedAt }) => ({
    marketId,
    title,
    placedAt: placedAt.toISOString(),
    mySide: mine.side,
    myStatus: mine.status,
    friendSide: theirs.side,
  }));

  return NextResponse.json({
    ok: true,
    record: { wins, losses, pushes },
    netAmount: Math.round(netAmount * 100) / 100,
    recentMatchups,
  });
}
