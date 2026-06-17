import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { submitDispute } from "../../../../../lib/server/disputeService.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const { marketId } = await params;
  const result = await submitDispute({
    marketId,
    betId: payload.betId,
    reason: payload.reason,
    userId: session.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
