import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../lib/server/adminPermissions.js";
import { updateDatabaseDispute } from "../../../../../lib/server/disputeService.js";

export async function PATCH(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.RISK);
  if (response) return response;

  const payload = await request.json();
  const result = await updateDatabaseDispute({
    disputeId: params.disputeId,
    status: payload.status,
    note: payload.note,
    actorId: session.userId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
