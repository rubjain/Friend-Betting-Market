import { NextResponse } from "next/server";
import { submitDatabaseMarket } from "../../../lib/server/marketService.js";
import { submitDemoMarket } from "../../../lib/server/demoStore.js";
import { requireAuthenticated } from "../../../lib/server/auth.js";

export async function POST(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const userId = session.userId;
  const databaseResult = await submitDatabaseMarket({
    draft: payload.draft,
    userId,
  });
  const result =
    databaseResult ??
    submitDemoMarket({
      draft: payload.draft,
      userId,
    });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
