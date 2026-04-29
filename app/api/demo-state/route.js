import { NextResponse } from "next/server";
import { getDatabaseState, resetDatabaseState } from "../../../lib/server/dbState.js";
import { getDemoState, resetDemoStore } from "../../../lib/server/demoStore.js";
import { getSessionFromRequest } from "../../../lib/server/auth.js";
import { hasDatabaseUrl } from "../../../lib/server/prisma.js";

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
  const session = await getSessionFromRequest(request);
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
