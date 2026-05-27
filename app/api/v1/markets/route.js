import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../lib/server/auth.js";
import { getDatabaseState } from "../../../../lib/server/dbState.js";
import { getDemoState } from "../../../../lib/server/demoStore.js";
import { hasDatabaseUrl } from "../../../../lib/server/prisma.js";
import { betaRuntimeError } from "../../../../lib/server/betaRuntime.js";

export async function GET(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) {
    return caller.response;
  }
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "read:markets");
  if (!scopeCheck.ok) {
    return scopeCheck.response;
  }
  const userId = caller.userId;

  const state = hasDatabaseUrl()
    ? await getDatabaseState(undefined, userId)
    : getDemoState(userId);

  return NextResponse.json({ ok: true, markets: state.markets || [] });
}

