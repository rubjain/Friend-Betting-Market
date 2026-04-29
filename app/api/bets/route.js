import { NextResponse } from "next/server";
import { placeBet } from "../../../lib/server/betService.js";
import { placeDemoBet } from "../../../lib/server/demoStore.js";
import { getSessionFromRequest } from "../../../lib/server/auth.js";

export async function POST(request) {
  const payload = await request.json();
  const session = await getSessionFromRequest(request);
  const userId = session.userId;
  const databaseResult = await placeBet({
    marketId: payload.marketId,
    side: payload.side,
    betDraft: payload.betDraft,
    userId,
  });
  const result =
    databaseResult ??
    placeDemoBet({
      marketId: payload.marketId,
      side: payload.side,
      betDraft: payload.betDraft,
    });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
