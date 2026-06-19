import { NextResponse } from "next/server";
import { placeBet } from "../../../lib/server/betService.js";
import { placeDemoBet } from "../../../lib/server/demoStore.js";
import { requireAuthenticated } from "../../../lib/server/auth.js";

export async function POST(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const userId = session.userId;
  const isPaper = Boolean(payload.isPaper);
  const databaseResult = await placeBet({
    marketId: payload.marketId,
    side: payload.side,
    betDraft: payload.betDraft,
    userId,
    isPaper,
  });
  const result =
    databaseResult ??
    placeDemoBet({
      marketId: payload.marketId,
      side: payload.side,
      betDraft: payload.betDraft,
      isPaper,
    });

  return NextResponse.json(result, { status: result.ok ? 201 : 400 });
}
