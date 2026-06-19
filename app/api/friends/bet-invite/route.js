import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { prisma, hasDatabaseUrl } from "../../../../lib/server/prisma.js";
import {
  createBetInvite,
  getInvitesForUser,
  getSentInvites,
  updateInviteStatus,
} from "../../../../lib/server/betInviteStore.js";

// GET — fetch pending invites for current user (received + sent)
export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.authenticated) return NextResponse.json({ ok: false }, { status: 401 });

    const received = getInvitesForUser(session.userId);
    const sent = getSentInvites(session.userId);

    return NextResponse.json({ ok: true, received, sent });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// POST — send bet invites to one or more friends
export async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.authenticated) return NextResponse.json({ ok: false }, { status: 401 });

    const { marketId, marketTitle, friendIds, message, side } = await request.json();
    if (!marketId || !friendIds?.length) {
      return NextResponse.json({ ok: false, message: "marketId and friendIds are required." }, { status: 400 });
    }

    // Get sender info
    let fromName = "Someone";
    let fromUsername = "@unknown";
    if (hasDatabaseUrl()) {
      const sender = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, username: true },
      });
      if (sender) { fromName = sender.name; fromUsername = sender.username; }
    }

    const created = [];
    for (const toUserId of friendIds) {
      const inv = createBetInvite({
        fromUserId: session.userId,
        fromName,
        fromUsername,
        toUserId,
        marketId,
        marketTitle,
        message,
        side,
      });
      created.push(inv);
    }

    return NextResponse.json({ ok: true, count: created.length });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// PATCH — update invite status (accept / decline)
export async function PATCH(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session?.authenticated) return NextResponse.json({ ok: false }, { status: 401 });

    const { inviteId, status } = await request.json();
    if (!inviteId || !["accepted", "declined"].includes(status)) {
      return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
    }

    const updated = updateInviteStatus(inviteId, status);
    if (!updated || updated.toUserId !== session.userId) {
      return NextResponse.json({ ok: false, message: "Invite not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, invite: updated });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
