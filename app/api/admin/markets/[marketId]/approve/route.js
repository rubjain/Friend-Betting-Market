import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/server/auth.js";
import { approveDraftMarket } from "../../../../../../lib/server/draftMarketGenerator";
import { approveDatabaseMarket } from "../../../../../../lib/server/marketService.js";
import { approveDemoMarket } from "../../../../../../lib/server/demoStore.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAdmin(request);
  if (response) return response;

  const draftResult = await approveDraftMarket(params.marketId, session.userId);
  if (draftResult) {
    return NextResponse.json({
      ok: true,
      message: `Published "${draftResult.question}".`,
      draft: draftResult,
    });
  }

  const databaseResult = await approveDatabaseMarket({
    pendingId: params.marketId,
    userId: session.userId,
  });
  const result = databaseResult ?? approveDemoMarket({ pendingId: params.marketId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
