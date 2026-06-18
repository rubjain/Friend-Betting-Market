import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../../lib/server/auth.js";
import { prisma, hasDatabaseUrl } from "../../../../../lib/server/prisma.js";

export async function GET(request, { params }) {
  const { marketId } = await params;
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: true, comments: [] });
  const comments = await prisma.marketComment.findMany({
    where: { marketId },
    include: { user: { select: { id: true, name: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ ok: true, comments: comments.map(c => ({ id: c.id, content: c.content, createdAt: c.createdAt.toISOString(), userId: c.userId, userName: c.user.name, userUsername: c.user.username })) });
}

export async function POST(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) return NextResponse.json({ ok: false, message: "Sign in to comment." }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: false, message: "Comments require a database." }, { status: 400 });
  const { marketId } = await params;
  const { content } = await request.json();
  if (!content?.trim()) return NextResponse.json({ ok: false, message: "Comment cannot be empty." }, { status: 400 });
  if (content.length > 500) return NextResponse.json({ ok: false, message: "Comment must be under 500 characters." }, { status: 400 });
  const comment = await prisma.marketComment.create({
    data: { userId: session.userId, marketId, content: content.trim() },
    include: { user: { select: { id: true, name: true, username: true } } },
  });
  return NextResponse.json({ ok: true, comment: { id: comment.id, content: comment.content, createdAt: comment.createdAt.toISOString(), userId: comment.userId, userName: comment.user.name, userUsername: comment.user.username } }, { status: 201 });
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) return NextResponse.json({ ok: false }, { status: 401 });
  if (!hasDatabaseUrl()) return NextResponse.json({ ok: false }, { status: 400 });
  const { commentId } = await request.json();
  const comment = await prisma.marketComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.userId !== session.userId) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  await prisma.marketComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
