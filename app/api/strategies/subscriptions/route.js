import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../lib/server/auth.js";
import { listUserStrategySubscriptions } from "../../../../lib/server/strategyMarketplaceService.js";

export async function GET(request) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const subscriptions = await listUserStrategySubscriptions({ userId: auth.session.userId });
  return NextResponse.json({ ok: true, subscriptions });
}
