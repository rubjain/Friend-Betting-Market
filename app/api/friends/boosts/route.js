import { NextResponse } from "next/server";
import { toggleDatabaseFriendBoost } from "../../../../lib/server/friendService.js";
import { toggleDemoFriendBoost } from "../../../../lib/server/demoStore.js";
import { requireAuthenticated } from "../../../../lib/server/auth.js";

export async function POST(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const userId = session.userId;
  const databaseResult = await toggleDatabaseFriendBoost({
    username: payload.username,
    marketId: payload.marketId,
    userId,
  });
  const result =
    databaseResult ??
    toggleDemoFriendBoost({
      username: payload.username,
      marketId: payload.marketId,
      userId,
    });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
