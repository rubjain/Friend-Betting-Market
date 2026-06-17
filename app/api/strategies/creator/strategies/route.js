import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { listCreatorPrivateStrategies } from "../../../../../lib/server/strategyMarketplaceService.js";

export async function GET(request) {
  const auth = await requireAuthenticated(request);
  if (auth.response) return auth.response;
  const result = await listCreatorPrivateStrategies({ creatorId: auth.session.userId });
  return NextResponse.json(result);
}
