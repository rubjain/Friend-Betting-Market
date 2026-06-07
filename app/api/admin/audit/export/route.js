import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../lib/server/adminPermissions.js";
import { exportAuditTrail } from "../../../../lib/server/adminComplianceService.js";

export async function GET(request) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.READ);
  if (response) return response;

  const limit = Number(new URL(request.url).searchParams.get("limit") || 500);
  const result = await exportAuditTrail({ limit });
  return NextResponse.json(result);
}
