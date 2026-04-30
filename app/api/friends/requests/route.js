import { NextResponse } from "next/server";
import { handleDatabaseFriendRequest } from "../../../../lib/server/friendService.js";
import { handleDemoFriendRequest } from "../../../../lib/server/demoStore.js";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";

export async function POST(request) {
  const payload = await request.json();
  const session = await getSessionFromRequest(request);
  const userId = session.userId;
  const databaseResult = await handleDatabaseFriendRequest({
    username: payload.username,
    action: payload.action,
    userId,
  });
  const result =
    databaseResult ??
    handleDemoFriendRequest({
      username: payload.username,
      action: payload.action,
      userId,
    });

  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
