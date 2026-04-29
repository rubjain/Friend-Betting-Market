import { NextResponse } from "next/server";
import { updateDatabaseVerification } from "../../../../lib/server/profileService.js";
import { updateDemoVerification } from "../../../../lib/server/demoStore.js";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";

export async function POST(request) {
  const payload = await request.json();
  const session = await getSessionFromRequest(request);
  const userId = session.userId;
  const databaseResult = await updateDatabaseVerification({ type: payload.type, userId });
  const result = databaseResult ?? updateDemoVerification({ type: payload.type });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
