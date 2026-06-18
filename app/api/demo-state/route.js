import { NextResponse } from "next/server";
import { getDatabaseState, resetDatabaseState } from "../../../lib/server/dbState.js";
import { getDemoState, resetDemoStore } from "../../../lib/server/demoStore.js";
import { getSessionFromRequest, requireAdmin } from "../../../lib/server/auth.js";
import { hasDatabaseUrl } from "../../../lib/server/prisma.js";
import { agoraPublicBetaEnabled } from "../../../lib/server/env.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (hasDatabaseUrl()) {
    const state = await getDatabaseState(undefined, session.userId);
    return NextResponse.json({
      state: { ...state, currentUser: { ...state.currentUser, isAdmin: session.isAdmin } },
    });
  }

  const state = getDemoState();
  return NextResponse.json({
    state: { ...state, currentUser: { ...state.currentUser, isAdmin: session.isAdmin } },
  });
}

export async function DELETE(request) {
  if (process.env.NODE_ENV === "production" && agoraPublicBetaEnabled()) {
    return NextResponse.json(
      { ok: false, message: "Database reset is disabled in the hosted beta." },
      { status: 403 },
    );
  }

  const { session, response } = await requireAdmin(request);
  if (response) return response;

  if (hasDatabaseUrl()) {
    const state = await resetDatabaseState(undefined, session.userId);
    return NextResponse.json({
      state: { ...state, currentUser: { ...state.currentUser, isAdmin: session.isAdmin } },
    });
  }

  const state = resetDemoStore();
  return NextResponse.json({
    state: { ...state, currentUser: { ...state.currentUser, isAdmin: session.isAdmin } },
  });
}
