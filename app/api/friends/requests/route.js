import { NextResponse } from "next/server";
import { handleDatabaseFriendRequest, removeDatabaseFriend } from "../../../../lib/server/friendService.js";
import { handleDemoFriendRequest, removeDemoFriend } from "../../../../lib/server/demoStore.js";
import { requireAuthenticated } from "../../../../lib/server/auth.js";

export async function POST(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
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

export async function DELETE(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const userId = session.userId;
  const databaseResult = await removeDatabaseFriend({ username: payload.username, userId });
  const result = databaseResult ?? removeDemoFriend({ username: payload.username, userId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
