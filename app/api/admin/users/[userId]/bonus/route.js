import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/server/auth.js";
import { removeDatabaseUserBonus } from "../../../../../../lib/server/userRiskService.js";
import { removeDemoUserBonus } from "../../../../../../lib/server/demoStore.js";

export async function DELETE(request, { params }) {
  const { session, response } = await requireAdmin(request);
  if (response) return response;

  const databaseResult = await removeDatabaseUserBonus({
    targetUserId: params.userId,
    actorId: session.userId,
  });
  const result = databaseResult ?? removeDemoUserBonus({ userId: params.userId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
