import { NextResponse } from "next/server";
import { requireApiKeyScopes, resolvePublicApiCaller } from "../../../../lib/server/auth.js";
import { hasDatabaseUrl } from "../../../../lib/server/prisma.js";
import { createLimitOrder, getOrdersForState, cancelOrder } from "../../../../lib/server/orderService.js";
import { createDemoLimitOrder, getDemoOrders, cancelDemoOrder } from "../../../../lib/server/demoStore.js";
import { getDatabaseState } from "../../../../lib/server/dbState.js";
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
  if (!caller.ok) return caller.response;
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, "read:portfolio");
  if (!scopeCheck.ok) return scopeCheck.response;

  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: true, orders: getDemoOrders() });
  }
  const orders = await getOrdersForState(caller.userId);
  return NextResponse.json({ ok: true, orders });
}

export async function POST(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) return caller.response;

  const body = await request.json().catch(() => ({}));
  const mode = String(body.mode || (body.isPaper === false ? "real" : "paper")).toLowerCase();
  const isPaper = mode === "paper" || Boolean(body.isPaper);
  if (!isPaper && shouldBlockRealMoney()) {
    return NextResponse.json(realMoneyDisabledPayload(), { status: 403 });
  }
  const scopeCheck = requireApiKeyScopes(caller.apiKeyScopes, isPaper ? "trade:paper" : "trade:real");
  if (!scopeCheck.ok) return scopeCheck.response;

  const { marketId, side, quantity, limitPrice, limitExpiry } = body;
  if (!marketId || !side || !quantity || !limitPrice) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  if (!hasDatabaseUrl()) {
    const result = createDemoLimitOrder({
      marketId,
      side,
      quantity: Number(quantity),
      limitPrice: Number(limitPrice),
      isPaper,
      limitExpiry,
    });
    if (!result?.ok) {
      return NextResponse.json(
        { ...result, code: inferV1ErrorCode(result?.message) },
        { status: 400 },
      );
    }
    return NextResponse.json(result, { status: 201 });
  }

  const result = await createLimitOrder({
    userId: caller.userId,
    marketId,
    side,
    quantity: Number(quantity),
    limitPrice: Number(limitPrice),
    isPaper,
    limitExpiry: limitExpiry || "7d",
  });
  if (!result.ok) {
    return NextResponse.json(
      { ...result, code: inferV1ErrorCode(result?.message) },
      { status: 400 },
    );
  }
  const state = await getDatabaseState(undefined, caller.userId);
  return NextResponse.json({ ...result, state }, { status: 201 });
}

export async function DELETE(request) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) return NextResponse.json(runtimeError, { status: 503 });

  const caller = await resolvePublicApiCaller(request);
  if (!caller.ok) return caller.response;

  const body = await request.json().catch(() => ({}));
  const { orderId } = body;
  if (!orderId) {
    return NextResponse.json(
      { ok: false, message: "Missing orderId.", code: "BAD_REQUEST" },
      { status: 400 },
    );
  }
  if (!hasDatabaseUrl()) {
    const result = cancelDemoOrder(orderId);
    if (!result?.ok) {
      return NextResponse.json(
        { ...result, code: inferV1ErrorCode(result?.message) },
        { status: 400 },
      );
    }
    return NextResponse.json(result, { status: 200 });
  }
  const result = await cancelOrder(orderId, caller.userId);
  if (!result.ok) {
    return NextResponse.json(
      { ...result, code: inferV1ErrorCode(result?.message) },
      { status: 400 },
    );
  }
  const state = await getDatabaseState(undefined, caller.userId);
  return NextResponse.json({ ...result, state });
}
