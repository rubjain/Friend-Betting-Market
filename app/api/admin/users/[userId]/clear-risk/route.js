import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../../lib/server/adminPermissions.js";
import { clearDatabaseRiskReview } from "../../../../../../lib/server/userRiskService.js";
import { clearDemoRiskReview } from "../../../../../../lib/server/demoStore.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.RISK);
  if (response) return response;

  const databaseResult = await clearDatabaseRiskReview({
    targetUserId: params.userId,
    actorId: session.userId,
  });
  const result = databaseResult ?? clearDemoRiskReview({ userId: params.userId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
