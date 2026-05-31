import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../../../lib/server/auth.js";
import { getStrategy, updateStrategy } from "../../../../../../lib/server/strategyService.js";
import { inferV1ErrorCode } from "../../../../../../lib/server/v1ErrorCodes.js";
import {
  betaRuntimeError,
  realMoneyDisabledPayload,
  shouldBlockRealMoney,
} from "../../../../../../lib/server/betaRuntime.js";

export async function POST(request, context) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) return caller.response;

  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
  if (!scopeCheck.ok) return scopeCheck.response;

  const userId = caller.userId;
  const strategyId = context?.params?.strategyId;
  const strategy = await getStrategy({ userId, strategyId });
  if (!strategy) {
    return NextResponse.json(
      { ok: false, message: "Strategy not found.", code: "NOT_FOUND" },
      { status: 404 },
    );
  }
  if (String(strategy.mode).toUpperCase() === "REAL" && shouldBlockRealMoney()) {
    return NextResponse.json(realMoneyDisabledPayload(), { status: 403 });
  }

  const result = await updateStrategy({
    userId,
    strategyId,
    patch: { status: "ACTIVE" },
  });

  if (!result?.ok) {
    const code = inferV1ErrorCode(result?.message);
    const status = String(result?.message || "").toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ ...result, code }, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
