import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/server/auth.js";
import { rejectDraftMarket } from "../../../../../../lib/server/draftMarketGenerator";
import { rejectDatabaseMarket } from "../../../../../../lib/server/marketService.js";
import { rejectDemoMarket } from "../../../../../../lib/server/demoStore.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAdmin(request);
  if (response) return response;

  const draftResult = await rejectDraftMarket(params.marketId, session.userId);
  if (draftResult) {
    return NextResponse.json({
      ok: true,
      message: `Rejected "${draftResult.question}".`,
      draft: draftResult,
    });
  }

  const databaseResult = await rejectDatabaseMarket({
    pendingId: params.marketId,
    userId: session.userId,
  });
  const result = databaseResult ?? rejectDemoMarket({ pendingId: params.marketId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
