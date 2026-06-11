import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { listProfileCopyTrades } from "../../../../../lib/server/strategyMarketplaceService.js";

export async function GET(request, context) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const { profileId } = await context.params;
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 50);
  const copyTrades = await listProfileCopyTrades({
    userId: auth.session.userId,
    profileId,
    limit,
  });
  return NextResponse.json({ ok: true, copyTrades });
}
