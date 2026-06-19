import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../../lib/server/adminPermissions.js";
import { reverseDatabaseBet } from "../../../../../../lib/server/betReversalService.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.RISK);
  if (response) return response;

  const payload = await request.json();
  const { betId } = await params;
  const result = await reverseDatabaseBet({
    betId,
    actorId: session.userId,
    reason: payload.reason,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
