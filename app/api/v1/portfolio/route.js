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
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "read:portfolio");
  if (!scopeCheck.ok) {
    return scopeCheck.response;
  }
  const userId = caller.userId;

  const state = hasDatabaseUrl()
    ? await getDatabaseState(undefined, userId)
    : getDemoState(userId);
  const mode = (new URL(request.url).searchParams.get("mode") || "all").toLowerCase();
  const onlyPaper = mode === "paper";
  const onlyReal = mode === "real";
  const openBets = state.portfolio.openBets.filter((bet) => (onlyPaper ? bet.isPaper : onlyReal ? !bet.isPaper : true));
  const pastBets = state.portfolio.pastBets.filter((bet) => (onlyPaper ? bet.isPaper : onlyReal ? !bet.isPaper : true));
  const openOrders = (state.openOrders || []).filter((order) => (onlyPaper ? order.isPaper : onlyReal ? !order.isPaper : true));

  return NextResponse.json({
    ok: true,
    portfolio: {
      ...state.portfolio,
      openBets,
      pastBets,
    },
    balances: {
      withdrawable: onlyPaper ? 0 : (state.currentUser.withdrawable_balance ?? 0),
      bonus: onlyPaper ? 0 : (state.currentUser.bonus_balance ?? 0),
      paper: onlyReal ? 0 : (state.currentUser.paper_balance ?? 0),
    },
    openOrders,
  });
}

