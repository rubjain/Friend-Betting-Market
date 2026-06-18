import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../lib/server/auth.js";
import { createStrategy, listStrategies } from "../../../../lib/server/strategyService.js";
import { inferV1ErrorCode } from "../../../../lib/server/v1ErrorCodes.js";
import {
  betaRuntimeError,
  realMoneyDisabledPayload,
  shouldBlockRealMoney,
} from "../../../../lib/server/betaRuntime.js";

export async function GET(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) {
    return caller.response;
  }
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
  if (!scopeCheck.ok) {
    return scopeCheck.response;
  }
  const userId = caller.userId;

  const strategies = await listStrategies(userId);
  return NextResponse.json({ ok: true, strategies });
}

export async function POST(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) {
    return caller.response;
  }
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
  if (!scopeCheck.ok) {
    return scopeCheck.response;
  }
  const userId = caller.userId;

  const body = await request.json().catch(() => ({}));
  if (String(body.mode || "PAPER").toUpperCase() === "REAL" && shouldBlockRealMoney()) {
    return NextResponse.json(realMoneyDisabledPayload(), { status: 403 });
  }

  const result = await createStrategy({
    userId,
    name: body.name,
    mode: body.mode,
    status: body.status,
    type: body.type,
    config: body.config,
  });

  if (!result?.ok) {
    return NextResponse.json({ ...result, code: inferV1ErrorCode(result?.message) }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
