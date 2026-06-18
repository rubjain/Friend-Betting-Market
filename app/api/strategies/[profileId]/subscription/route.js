import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import {
  cancelStrategySubscription,
  updateStrategySubscription,
} from "../../../../../lib/server/strategyMarketplaceService.js";

export async function PATCH(request, context) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const { profileId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await updateStrategySubscription({
    userId: auth.session.userId,
    profileId,
    input: { ...body, accountMode: "PAPER" },
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function DELETE(request, context) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const { profileId } = await context.params;
  const result = await cancelStrategySubscription({ userId: auth.session.userId, profileId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
