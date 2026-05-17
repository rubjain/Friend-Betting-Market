import { NextResponse } from "next/server";
import { getHeadToHeadStats } from "../../../../lib/friendStats.js";
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
      record: { wins: 0, losses: 0, pushes: 0, open: 0 },
      summary: { total: 0, settled: 0, winRate: 0, open: 0, stakeAtRisk: 0 },
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

  const stats = getHeadToHeadStats(myBets, friendBets);

  return NextResponse.json({
    ok: true,
    ...stats,
  });
}
