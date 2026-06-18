import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { getCreatorRevenueSummary } from "../../../../../lib/server/strategyMarketplaceService.js";

export async function GET(request) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const result = await getCreatorRevenueSummary({ creatorId: auth.session.userId });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
