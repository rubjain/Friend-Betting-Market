import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { hasDatabaseUrl, prisma } from "../../../../lib/server/prisma.js";

export async function GET(request, { params }) {
  await getSessionFromRequest(request);
  const { username } = params;

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      createdAt: true,
      bets: {
        where: { status: { in: ["WON", "LOST", "SOLD"] }, isPaper: false },
        select: { status: true, stake: true, expectedMultiplier: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, message: "User not found." }, { status: 404 });
  }

  const won = user.bets.filter((b) => b.status === "WON");
  const lost = user.bets.filter((b) => b.status === "LOST");
  const totalBets = user.bets.length;
  const winRate = totalBets > 0 ? Math.round((won.length / totalBets) * 1000) / 10 : 0;
  const profit =
    won.reduce((sum, b) => sum + Number(b.stake) * (Number(b.expectedMultiplier) - 1), 0) -
    lost.reduce((sum, b) => sum + Number(b.stake), 0);

  // Compute global real-money rank
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      bets: {
        where: { status: { in: ["WON", "LOST"] }, isPaper: false },
        select: { status: true, stake: true, expectedMultiplier: true },
      },
    },
  });

  const ranked = allUsers
    .map((u) => {
      const w = u.bets.filter((b) => b.status === "WON");
      const l = u.bets.filter((b) => b.status === "LOST");
      const p =
        w.reduce((s, b) => s + Number(b.stake) * (Number(b.expectedMultiplier) - 1), 0) -
        l.reduce((s, b) => s + Number(b.stake), 0);
      return { id: u.id, bets: u.bets.length, profit: p };
    })
    .filter((u) => u.bets > 0)
    .sort((a, b) => b.profit - a.profit);

  const rankIndex = ranked.findIndex((u) => u.id === user.id);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  return NextResponse.json({
    ok: true,
    profile: {
      name: user.name,
      username: user.username,
      joinedAt: user.createdAt.toISOString().slice(0, 7),
      totalBets,
      wins: won.length,
      losses: lost.length,
      winRate,
      profit: Math.round(profit * 100) / 100,
      rank,
    },
  });
}
