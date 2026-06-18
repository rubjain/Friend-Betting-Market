import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../lib/server/auth.js";
import { placeBet } from "../../../../lib/server/betService.js";
import { recordStrategySignalFromBet } from "../../../../lib/server/copyTradingService.js";
import { placeDemoBet } from "../../../../lib/server/demoStore.js";
import { getStrategy } from "../../../../lib/server/strategyService.js";
import { inferV1ErrorCode } from "../../../../lib/server/v1ErrorCodes.js";
import {
  betaRuntimeError,
  realMoneyDisabledPayload,
  shouldBlockRealMoney,
} from "../../../../lib/server/betaRuntime.js";

export async function POST(request) {
  const payload = await request.json();
  const mode = String(payload.mode || (payload.isPaper === false ? "real" : "paper")).toLowerCase();
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
  if (!isPaper && shouldBlockRealMoney()) {
    return NextResponse.json(realMoneyDisabledPayload(), { status: 403 });
  }

  const runtimeError = betaRuntimeError();
  if (runtimeError) {
    return NextResponse.json(runtimeError, { status: 503 });
  }

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) {
    return caller.response;
  }
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, isPaper ? "trade:paper" : "trade:real");
  if (!scopeCheck.ok) {
    return scopeCheck.response;
  }
  if (payload.strategyId) {
    const strategyScopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
    if (!strategyScopeCheck.ok) {
      return strategyScopeCheck.response;
    }
  }
  const userId = caller.userId;

  let taggedStrategy = null;
  if (payload.strategyId) {
    taggedStrategy = await getStrategy({ userId, strategyId: String(payload.strategyId) });
    if (!taggedStrategy) {
      return NextResponse.json(
        { ok: false, message: "Strategy not found.", code: "NOT_FOUND" },
        { status: 404 },
      );
    }
    if (!isPaper) {
      return NextResponse.json(realMoneyDisabledPayload(), { status: 403 });
    }
  }

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

  if (taggedStrategy && databaseResult?.betId) {
    await recordStrategySignalFromBet({
      strategyId: taggedStrategy.id,
      sourceBetId: databaseResult.betId,
      creatorId: userId,
      accountMode: isPaper ? "PAPER" : "REAL",
    }).catch(() => null);
  }

  return NextResponse.json(result, { status: 201 });
}
