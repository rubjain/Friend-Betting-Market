import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../lib/server/auth.js";
import { listMarketplaceProfiles } from "../../../lib/server/strategyMarketplaceService.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  const profiles = await listMarketplaceProfiles({
    userId: session.authenticated ? session.userId : undefined,
  });
  return NextResponse.json({ ok: true, profiles });
}
