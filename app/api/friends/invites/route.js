import { NextResponse } from "next/server";
import { sendDatabaseFriendInvite } from "../../../../lib/server/friendService.js";
import { sendDemoFriendInvite } from "../../../../lib/server/demoStore.js";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";

export async function POST(request) {
  const payload = await request.json();
  const session = await getSessionFromRequest(request);
  const userId = session.userId;
  const databaseResult = await sendDatabaseFriendInvite({ username: payload.username, userId });
  const result = databaseResult ?? sendDemoFriendInvite({ username: payload.username, userId });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
