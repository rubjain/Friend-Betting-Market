import { NextResponse } from "next/server";
import { toggleDatabaseFriendBoost } from "../../../../lib/server/friendService.js";
import { toggleDemoFriendBoost } from "../../../../lib/server/demoStore.js";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";

export async function POST(request) {
  const payload = await request.json();
  const session = await getSessionFromRequest(request);
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
    });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
