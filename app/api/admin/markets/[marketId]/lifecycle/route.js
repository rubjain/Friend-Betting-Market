import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/server/auth.js";
import { updateDatabaseMarketLifecycle } from "../../../../../../lib/server/marketService.js";
import { updateDemoMarketLifecycle } from "../../../../../../lib/server/demoStore.js";

export async function PATCH(request, { params }) {
  const { session, response } = await requireAdmin(request);
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
