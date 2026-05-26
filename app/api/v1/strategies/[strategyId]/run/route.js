import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../../../lib/server/auth.js";
import { getStrategy, logStrategyExecution } from "../../../../../../lib/server/strategyService.js";
import { runStrategyOnce } from "../../../../../../lib/strategies/strategyRunner.js";
import { inferV1ErrorCode } from "../../../../../../lib/server/v1ErrorCodes.js";

export async function POST(request, context) {
  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) {
    return caller.response;
  }
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
  if (!scopeCheck.ok) {
    return scopeCheck.response;
  }
  const userId = caller.userId;

  const strategyId = context?.params?.strategyId;
  const strategy = await getStrategy({ userId, strategyId });
  if (!strategy) {
    return NextResponse.json(
      { ok: false, message: "Strategy not found.", code: inferV1ErrorCode("Strategy not found.") },
      { status: 404 },
    );
  }

  await logStrategyExecution({
    strategyId,
    userId,
    isPaper: String(strategy.mode).toUpperCase() === "PAPER",
    status: "STARTED",
    message: "Strategy run started.",
  });

  const result = await runStrategyOnce({ strategy, userId });

  await logStrategyExecution({
    strategyId,
    userId,
    isPaper: result.isPaper,
    status: result.ok ? "COMPLETED" : "FAILED",
    message: result.ok ? "Strategy run completed." : result.message,
    metadata: result,
  });

  const code = result?.ok ? undefined : inferV1ErrorCode(result?.message);
  return NextResponse.json(
    code ? { ...result, code } : { ...result },
    { status: result.ok ? 200 : 400 },
  );
}

