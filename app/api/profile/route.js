import { NextResponse } from "next/server";
import { updateDatabaseProfile } from "../../../lib/server/profileService.js";
import { updateDemoProfile } from "../../../lib/server/demoStore.js";
import { getSessionFromRequest } from "../../../lib/server/auth.js";

export async function PATCH(request) {
  const payload = await request.json();
  const session = await getSessionFromRequest(request);
  const userId = session.userId;
  const databaseResult = await updateDatabaseProfile({
    name: payload.name,
    email: payload.email,
    userId,
  });
  const result =
    databaseResult ??
    updateDemoProfile({
      name: payload.name,
      email: payload.email,
    });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
