import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../../lib/server/adminPermissions.js";
import { resolveDatabaseMarket } from "../../../../../../lib/server/marketService.js";
import { resolveDemoMarket } from "../../../../../../lib/server/demoStore.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.MARKET_RESOLUTION);
  if (response) return response;

  const payload = await request.json();
  const databaseResult = await resolveDatabaseMarket({
    activeId: params.marketId,
    result: payload.result,
    userId: session.userId,
  });
  const result =
    databaseResult ??
    resolveDemoMarket({
      activeId: params.marketId,
      result: payload.result,
    });

  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
