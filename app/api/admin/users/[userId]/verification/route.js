import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../../lib/server/adminPermissions.js";
import { adminUpdateVerification } from "../../../../../../lib/server/adminComplianceService.js";

export async function PATCH(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.RISK);
  if (response) return response;

  const payload = await request.json();
  const { userId } = await params;
  const result = await adminUpdateVerification({
    targetUserId: userId,
    type: payload.type,
    status: payload.status,
    actorId: session.userId,
    note: payload.note,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
