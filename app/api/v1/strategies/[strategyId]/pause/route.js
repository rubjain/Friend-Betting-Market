import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../../../lib/server/auth.js";
import { updateStrategy } from "../../../../../../lib/server/strategyService.js";
import { inferV1ErrorCode } from "../../../../../../lib/server/v1ErrorCodes.js";

export async function POST(request, context) {
  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) return caller.response;

  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "manage:strategies");
  if (!scopeCheck.ok) return scopeCheck.response;

  const userId = caller.userId;
  const strategyId = context?.params?.strategyId;

  const result = await updateStrategy({
    userId,
    strategyId,
    patch: { status: "PAUSED" },
  });

  if (!result?.ok) {
    const code = inferV1ErrorCode(result?.message);
    const status = String(result?.message || "").toLowerCase().includes("not found") ? 404 : 400;
    return NextResponse.json({ ...result, code }, { status });
  }

  return NextResponse.json(result, { status: 200 });
}

