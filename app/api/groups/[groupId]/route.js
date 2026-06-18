import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { prisma, hasDatabaseUrl } from "../../../../lib/server/prisma.js";

export async function GET(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: true, group: null });
  const { groupId } = await params;
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: { include: { bets: { where: { isPaper: false }, select: { status: true, stake: true, expectedMultiplier: true } } } } } } },
  });
  if (!group) return NextResponse.json({ ok: false, message: "Group not found." }, { status: 404 });
  const isMember = group.members.some(m => m.userId === session.userId);
  if (!isMember) return NextResponse.json({ ok: false, message: "Not a member." }, { status: 403 });
  const leaderboard = group.members.map(m => {
    const bets = m.user.bets;
    let totalBets = bets.length, settledBets = 0, wins = 0, totalStake = 0, estimatedPnl = 0;
    for (const bet of bets) {
      totalStake += Number(bet.stake);
      if (bet.status === "SETTLED") {
        settledBets++;
        const mult = Number(bet.expectedMultiplier);
        if (mult > 1) { wins++; estimatedPnl += Number(bet.stake) * (mult - 1); }
        else { estimatedPnl -= Number(bet.stake); }
      }
    }
    return { userId: m.userId, name: m.user.name, username: m.user.username, totalBets, settledBets, wins, winRate: settledBets > 0 ? Math.round((wins / settledBets) * 100) : null, totalStake, estimatedPnl, isOwner: m.userId === group.ownerId };
  }).sort((a, b) => b.estimatedPnl - a.estimatedPnl).map((s, i) => ({ ...s, rank: i + 1 }));
  return NextResponse.json({ ok: true, group: { id: group.id, name: group.name, description: group.description, ownerId: group.ownerId, inviteCode: group.ownerId === session.userId ? group.inviteCode : null, memberCount: group.members.length, leaderboard, createdAt: group.createdAt.toISOString() } });
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: false }, { status: 400 });
  const { groupId } = await params;
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ ok: false, message: "Group not found." }, { status: 404 });
  if (group.ownerId === session.userId) {
    await prisma.group.delete({ where: { id: groupId } });
    return NextResponse.json({ ok: true, message: "Group deleted." });
  }
  await prisma.groupMember.deleteMany({ where: { groupId, userId: session.userId } });
  return NextResponse.json({ ok: true, message: "Left group." });
}
