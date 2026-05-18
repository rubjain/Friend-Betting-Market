import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../lib/server/auth.js";
import { hasDatabaseUrl } from "../../../lib/server/prisma.js";
import { createLimitOrder, getOrdersForState, cancelOrder } from "../../../lib/server/orderService.js";
import { getDatabaseState } from "../../../lib/server/dbState.js";

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: true, orders: [] });
  }
  const orders = await getOrdersForState(session.userId);
  return NextResponse.json({ ok: true, orders });
}

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: false, message: "Orders require a database connection." }, { status: 400 });
  }

  const body = await request.json();
  const { marketId, side, quantity, limitPrice, isPaper, limitExpiry } = body;

  if (!marketId || !side || !quantity || !limitPrice) {
    return NextResponse.json({ ok: false, message: "Missing required fields." }, { status: 400 });
  }

  const result = await createLimitOrder({
    userId: session.userId,
    marketId,
    side,
    quantity: Number(quantity),
    limitPrice: Number(limitPrice),
    isPaper: Boolean(isPaper),
    limitExpiry: limitExpiry || "7d",
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const state = await getDatabaseState(undefined, session.userId);
  return NextResponse.json({ ...result, state }, { status: 201 });
}

export async function DELETE(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) {
    return NextResponse.json({ ok: false, message: "Not authenticated." }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: false, message: "Orders require a database connection." }, { status: 400 });
  }

  const { orderId } = await request.json();
  const result = await cancelOrder(orderId, session.userId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  const state = await getDatabaseState(undefined, session.userId);
  return NextResponse.json({ ...result, state });
}
