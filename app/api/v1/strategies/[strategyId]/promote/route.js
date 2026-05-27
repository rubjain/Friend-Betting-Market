import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../../../lib/server/auth.js";
import { promoteStrategyToReal } from "../../../../../../lib/server/strategyService.js";
import { inferV1ErrorCode } from "../../../../../../lib/server/v1ErrorCodes.js";
import { realMoneyDisabledPayload, shouldBlockRealMoney } from "../../../../../../lib/server/betaRuntime.js";

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
  if (shouldBlockRealMoney()) {
    return NextResponse.json(realMoneyDisabledPayload(), { status: 403 });
  }

  const strategyId = context?.params?.strategyId;
  const result = await promoteStrategyToReal({ userId, strategyId });
  if (!result?.ok) {
    return NextResponse.json(
      { ...result, code: inferV1ErrorCode(result?.message) },
      { status: 400 },
    );
  }
  return NextResponse.json(result, { status: 201 });
}
