import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../../lib/server/adminPermissions.js";
import { approveDraftMarket } from "../../../../../../lib/server/draftMarketGenerator";
import { approveDatabaseMarket } from "../../../../../../lib/server/marketService.js";
import { approveDemoMarket } from "../../../../../../lib/server/demoStore.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.MARKET_MODERATION);
  if (response) return response;

  const { marketId } = await params;

  const draftResult = await approveDraftMarket(marketId, session.userId);
  if (draftResult) {
    return NextResponse.json({
      ok: true,
      message: `Published "${draftResult.question}".`,
      draft: draftResult,
    });
  }

  const databaseResult = await approveDatabaseMarket({
    pendingId: marketId,
    userId: session.userId,
  });
  const result = databaseResult ?? approveDemoMarket({ pendingId: marketId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
