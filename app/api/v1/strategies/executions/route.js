import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../../lib/server/auth.js";
import { listStrategyExecutions } from "../../../../../lib/server/strategyService.js";
import { betaRuntimeError } from "../../../../../lib/server/betaRuntime.js";

export async function GET(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) return caller.response;
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
  if (!scopeCheck.ok) return scopeCheck.response;

  const limit = new URL(request.url).searchParams.get("limit");
  const executions = await listStrategyExecutions(caller.userId, { limit });
  return NextResponse.json({ ok: true, executions });
}

