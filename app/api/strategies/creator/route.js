import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../lib/server/auth.js";
import {
  listCreatorMarketplaceProfiles,
  publishMarketplaceProfile,
} from "../../../../lib/server/strategyMarketplaceService.js";

export async function GET(request) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const result = await listCreatorMarketplaceProfiles({ creatorId: auth.session.userId });
  return NextResponse.json(result);
}

export async function POST(request) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const result = await publishMarketplaceProfile({
    creatorId: auth.session.userId,
    strategyId: body.strategyId,
    profile: body,
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
