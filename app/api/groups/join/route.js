import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { prisma, hasDatabaseUrl } from "../../../../lib/server/prisma.js";

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: false, message: "Groups require a database." }, { status: 400 });
  const { inviteCode } = await request.json();
  if (!inviteCode) return NextResponse.json({ ok: false, message: "Invite code is required." }, { status: 400 });
  const group = await prisma.group.findUnique({ where: { inviteCode } });
  if (!group) return NextResponse.json({ ok: false, message: "Invalid invite code." }, { status: 404 });
  const existing = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId: session.userId } } });
  if (existing) return NextResponse.json({ ok: false, message: "You are already a member." }, { status: 400 });
  await prisma.groupMember.create({ data: { groupId: group.id, userId: session.userId } });
  return NextResponse.json({ ok: true, message: `Joined "${group.name}"!`, groupId: group.id });
}
