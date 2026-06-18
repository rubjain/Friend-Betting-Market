import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../../lib/server/auth.js";
import { prisma, hasDatabaseUrl } from "../../../../../lib/server/prisma.js";

export async function GET(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session?.authenticated) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: true, markets: [] });

  const { groupId } = await params;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { select: { userId: true, user: { select: { id: true, name: true, username: true } } } },
    },
  });
  if (!group) return NextResponse.json({ ok: false, message: "Group not found." }, { status: 404 });

  const isMember = group.members.some((m) => m.userId === session.userId);
  if (!isMember) return NextResponse.json({ ok: false }, { status: 403 });

  const memberIds = group.members.map((m) => m.userId);

  const bets = await prisma.bet.findMany({
    where: { userId: { in: memberIds }, status: "OPEN", isPaper: false },
    select: {
      userId: true,
      side: true,
      stake: true,
      market: {
        select: {
          id: true,
          title: true,
          category: true,
          yesPrice: true,
          noPrice: true,
          status: true,
        },
      },
    },
  });

  const marketMap = new Map();
  for (const bet of bets) {
    if (bet.market.status !== "ACTIVE") continue;

    if (!marketMap.has(bet.market.id)) {
      marketMap.set(bet.market.id, {
        id: bet.market.id,
        title: bet.market.title,
        category: bet.market.category,
        yesPrice: Number(bet.market.yesPrice),
        noPrice: Number(bet.market.noPrice),
        members: [],
      });
    }

    const member = group.members.find((m) => m.userId === bet.userId);
    if (member) {
      const entry = marketMap.get(bet.market.id);
      if (!entry.members.find((m) => m.id === member.userId)) {
        entry.members.push({
          id: member.userId,
          name: member.user.name,
          username: member.user.username,
          side: bet.side,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    markets: Array.from(marketMap.values()).sort(
      (a, b) => b.members.length - a.members.length,
    ),
  });
}
