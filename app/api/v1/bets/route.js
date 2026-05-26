import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../lib/server/auth.js";
import { placeBet } from "../../../../lib/server/betService.js";
import { placeDemoBet } from "../../../../lib/server/demoStore.js";
import { inferV1ErrorCode } from "../../../../lib/server/v1ErrorCodes.js";

export async function POST(request) {
  const payload = await request.json();
  const mode = String(payload.mode || "").toLowerCase();
  const isPaper = mode === "paper" || Boolean(payload.isPaper);
  const normalizedBetDraft = payload.betDraft || (
    payload.stake != null
      ? {
          stake: Number(payload.stake),
          withdrawableShare: Number(payload.stake),
          bonusShare: 0,
        }
      : null
  );

  if (!payload.marketId || !payload.side || !normalizedBetDraft) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }
  if (mode && mode !== "paper" && mode !== "real") {
    return NextResponse.json(
      { ok: false, message: "Invalid mode. Use \"paper\" or \"real\".", code: "INVALID_MODE" },
      { status: 400 },
    );
  }

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) {
    return caller.response;
  }
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, isPaper ? "trade:paper" : "trade:real");
  if (!scopeCheck.ok) {
    return scopeCheck.response;
  }
  const userId = caller.userId;

  const databaseResult = await placeBet({
    marketId: payload.marketId,
    side: payload.side,
    betDraft: normalizedBetDraft,
    userId,
    isPaper,
  });

  const result =
    databaseResult ??
    placeDemoBet({
      marketId: payload.marketId,
      side: payload.side,
      betDraft: normalizedBetDraft,
      isPaper,
    });

  if (!result?.ok) {
    return NextResponse.json(
      { ...result, code: inferV1ErrorCode(result?.message) },
      { status: 400 },
    );
  }

  return NextResponse.json(result, { status: 201 });
}

