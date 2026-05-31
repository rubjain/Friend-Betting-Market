import { NextResponse } from "next/server";
import { searchDemoFriends } from "../../../../lib/server/demoStore.js";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { searchDatabaseFriends } from "../../../../lib/server/friendService.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const databaseResult = await searchDatabaseFriends({ query, userId: session.userId });
  const result = databaseResult ?? searchDemoFriends({ query, userId: session.userId });

  return NextResponse.json(result);
}
