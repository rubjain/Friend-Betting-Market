import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { upsertStrategySubscription } from "../../../../../lib/server/strategyMarketplaceService.js";

export async function POST(request, context) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const { profileId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await upsertStrategySubscription({
    userId: auth.session.userId,
    profileId,
    input: { ...body, accountMode: "PAPER" },
  });
  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
