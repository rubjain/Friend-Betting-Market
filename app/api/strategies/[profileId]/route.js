import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { getMarketplaceProfile } from "../../../../lib/server/strategyMarketplaceService.js";

export async function GET(request, context) {
  const { profileId } = await context.params;
  const session = await getSessionFromRequest(request);
  const profile = await getMarketplaceProfile({
    profileId,
    userId: session.authenticated ? session.userId : undefined,
  });
  if (!profile) {
    return NextResponse.json({ ok: false, message: "Strategy profile not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, profile });
}
