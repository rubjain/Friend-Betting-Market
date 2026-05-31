import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../../lib/server/adminPermissions.js";
import { removeDatabaseUserBonus } from "../../../../../../lib/server/userRiskService.js";
import { removeDemoUserBonus } from "../../../../../../lib/server/demoStore.js";

export async function DELETE(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.RISK);
  if (response) return response;

  const databaseResult = await removeDatabaseUserBonus({
    targetUserId: params.userId,
    actorId: session.userId,
  });
  const result = databaseResult ?? removeDemoUserBonus({ userId: params.userId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
