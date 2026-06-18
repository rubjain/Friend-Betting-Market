import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { getSubscriptionBillingSummary } from "../../../../../lib/server/strategyMarketplaceService.js";

export async function GET(request, context) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const { profileId } = await context.params;
  const result = await getSubscriptionBillingSummary({
    userId: auth.session.userId,
    profileId,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
