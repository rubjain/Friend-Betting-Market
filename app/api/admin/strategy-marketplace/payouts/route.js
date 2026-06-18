import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import {
  createCreatorPayoutSnapshot,
  listPayoutReconciliationQueue,
  updateCreatorPayoutStatus,
} from "../../../../../lib/server/creatorPayoutService.js";

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const creatorId = body.creatorId;
  const periodStart = new Date(body.periodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const periodEnd = new Date(body.periodEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1));
  if (!creatorId) {
    return NextResponse.json({ ok: false, message: "creatorId is required." }, { status: 400 });
  }
  const result = await createCreatorPayoutSnapshot({ creatorId, periodStart, periodEnd });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const take = Number(url.searchParams.get("take") || 100);
  const result = await listPayoutReconciliationQueue({ take });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

export async function PATCH(request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  const body = await request.json().catch(() => ({}));
  const payoutId = body.payoutId;
  const status = body.status;
  if (!payoutId || !status) {
    return NextResponse.json({ ok: false, message: "payoutId and status are required." }, { status: 400 });
  }
  const result = await updateCreatorPayoutStatus({
    payoutId,
    status,
    providerRef: body.providerRef || null,
    actorId: auth.user?.id || null,
    note: body.note || null,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
