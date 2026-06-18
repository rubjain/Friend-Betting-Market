import { NextResponse } from "next/server";
import { updateDatabaseProfile } from "../../../lib/server/profileService.js";
import { updateDemoProfile } from "../../../lib/server/demoStore.js";
import { requireAuthenticated } from "../../../lib/server/auth.js";

export async function PATCH(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
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
