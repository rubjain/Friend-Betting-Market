import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import {
  getMarketplaceModerationQueue,
  moderateMarketplaceProfile,
} from "../../../../../lib/server/strategyMarketplaceService.js";

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const result = await getMarketplaceModerationQueue();
  return NextResponse.json(result, { status: 200 });
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const result = await moderateMarketplaceProfile({
    actorId: auth.session.userId,
    profileId: body.profileId,
    action: String(body.action || "").toUpperCase(),
    reason: body.reason || "",
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
