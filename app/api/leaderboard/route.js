import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../lib/server/auth.js";
import { hasDatabaseUrl, prisma } from "../../../lib/server/prisma.js";

function getPeriodStart(period) {
  const now = new Date();
  if (period === "daily") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === "weekly") {
    const start = new Date(now);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return null;
}

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "alltime";
  const scope = searchParams.get("scope") || "global";

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: true, rows: [], currentUserRow: null, currentUserRank: null, friendCount: 0 });
  }

  const userId = session.userId;
  const periodStart = getPeriodStart(period);

  const betWhere = {
    status: { in: ["WON", "LOST"] },
    ...(periodStart ? { placedAt: { gte: periodStart } } : {}),
  };

  let scopeUserIds = null;

  if (scope === "friends") {
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
    scopeUserIds = [...friendIds, userId];
  }

  const users = await prisma.user.findMany({
    where: scopeUserIds ? { id: { in: scopeUserIds } } : undefined,
    select: {
      id: true,
      name: true,
      username: true,
      bets: {
        where: betWhere,
        select: {
          status: true,
          stake: true,
          expectedMultiplier: true,
        },
      },
    },
  });

  const rows = users.map((user) => {
    const won = user.bets.filter((b) => b.status === "WON");
    const lost = user.bets.filter((b) => b.status === "LOST");
    const totalBets = user.bets.length;
    const winRate = totalBets > 0 ? Math.round((won.length / totalBets) * 1000) / 10 : 0;
    const profit =
      won.reduce((sum, b) => sum + Number(b.stake) * (Number(b.expectedMultiplier) - 1), 0) -
      lost.reduce((sum, b) => sum + Number(b.stake), 0);

    return {
      userId: user.id,
      name: user.name,
      username: user.username,
      profit: Math.round(profit * 100) / 100,
      winRate,
      totalBets,
    };
  });

  rows.sort((a, b) => b.profit - a.profit);

  const top25 = rows.slice(0, 25).map((r, i) => ({ ...r, rank: i + 1 }));

  const currentUserGlobalIndex = rows.findIndex((r) => r.userId === userId);
  const currentUserRank = currentUserGlobalIndex >= 0 ? currentUserGlobalIndex + 1 : null;
  const currentUserRow =
    currentUserGlobalIndex >= 0
      ? { ...rows[currentUserGlobalIndex], rank: currentUserRank }
      : null;

  return NextResponse.json({
    ok: true,
    rows: top25,
    currentUserRank,
    currentUserRow,
    friendCount: scopeUserIds ? scopeUserIds.length - 1 : null,
  });
}
