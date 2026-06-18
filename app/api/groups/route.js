import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../lib/server/auth.js";
import { prisma, hasDatabaseUrl } from "../../../lib/server/prisma.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: true, groups: [] });
  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.userId },
    include: { group: { include: { owner: { select: { name: true, username: true } }, members: { include: { user: { select: { id: true, name: true, username: true } } } } } } },
    orderBy: { joinedAt: "desc" },
  });
  const groups = memberships.map(m => ({
    id: m.group.id, name: m.group.name, description: m.group.description, ownerId: m.group.ownerId,
    ownerName: m.group.owner.name, inviteCode: m.group.ownerId === session.userId ? m.group.inviteCode : null,
    memberCount: m.group.members.length, members: m.group.members.map(gm => ({ id: gm.user.id, name: gm.user.name, username: gm.user.username })),
    createdAt: m.group.createdAt.toISOString(), isOwner: m.group.ownerId === session.userId,
  }));
  return NextResponse.json({ ok: true, groups });
}

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: false, message: "Groups require a database." }, { status: 400 });
  const { name, description } = await request.json();
  if (!name?.trim()) return NextResponse.json({ ok: false, message: "Group name is required." }, { status: 400 });
  const group = await prisma.group.create({
    data: { name: name.trim(), description: description?.trim() || null, ownerId: session.userId, members: { create: { userId: session.userId } } },
  });
  return NextResponse.json({ ok: true, group: { id: group.id, name: group.name, inviteCode: group.inviteCode } }, { status: 201 });
}
