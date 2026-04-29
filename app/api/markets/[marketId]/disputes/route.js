import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../../lib/server/auth.js";
import { submitDispute } from "../../../../../lib/server/disputeService.js";

export async function POST(request, { params }) {
  const payload = await request.json();
  const session = await getSessionFromRequest(request);
  const result = await submitDispute({
    marketId: params.marketId,
    betId: payload.betId,
    reason: payload.reason,
    userId: session.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
