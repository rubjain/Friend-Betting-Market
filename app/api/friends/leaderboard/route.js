import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { prisma, hasDatabaseUrl } from "../../../../lib/server/prisma.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: true, leaderboard: [] });

  const friendships = await prisma.friendship.findMany({
    where: { status: "CONFIRMED", OR: [{ requesterId: session.userId }, { addresseeId: session.userId }] },
  });
  const friendIds = friendships.map(f => f.requesterId === session.userId ? f.addresseeId : f.requesterId);
  const participantIds = [session.userId, ...friendIds];

  const users = await prisma.user.findMany({ where: { id: { in: participantIds } }, select: { id: true, name: true, username: true } });
  const bets = await prisma.bet.findMany({
    where: { userId: { in: participantIds }, isPaper: false },
    select: { userId: true, status: true, stake: true, expectedMultiplier: true },
  });

  const statsMap = {};
  for (const u of users) statsMap[u.id] = { userId: u.id, name: u.name, username: u.username, totalBets: 0, settledBets: 0, wins: 0, totalStake: 0, estimatedPnl: 0 };
  for (const bet of bets) {
    const s = statsMap[bet.userId];
    if (!s) continue;
    s.totalBets++;
    s.totalStake += Number(bet.stake);
    if (bet.status === "SETTLED") {
      s.settledBets++;
      const mult = Number(bet.expectedMultiplier);
      if (mult > 1) { s.wins++; s.estimatedPnl += Number(bet.stake) * (mult - 1); }
      else { s.estimatedPnl -= Number(bet.stake); }
    }
  }

  const leaderboard = Object.values(statsMap)
    .map(s => ({ ...s, winRate: s.settledBets > 0 ? Math.round((s.wins / s.settledBets) * 100) : null }))
    .sort((a, b) => b.estimatedPnl - a.estimatedPnl)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return NextResponse.json({ ok: true, leaderboard });
}
