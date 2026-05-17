import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../../lib/server/adminPermissions.js";
import { updateDatabaseMarketLifecycle } from "../../../../../../lib/server/marketService.js";
import { updateDemoMarketLifecycle } from "../../../../../../lib/server/demoStore.js";

export async function PATCH(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.MARKET_MODERATION);
  if (response) return response;

  const payload = await request.json();
  const databaseResult = await updateDatabaseMarketLifecycle({
    activeId: params.marketId,
    status: payload.status,
    userId: session.userId,
  });
  const result =
    databaseResult ??
    updateDemoMarketLifecycle({
      activeId: params.marketId,
      status: payload.status,
    });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
