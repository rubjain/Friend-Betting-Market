import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../../lib/server/auth.js";
import { clearDatabaseRiskReview } from "../../../../../../lib/server/userRiskService.js";
import { clearDemoRiskReview } from "../../../../../../lib/server/demoStore.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAdmin(request);
  if (response) return response;

  const databaseResult = await clearDatabaseRiskReview({
    targetUserId: params.userId,
    actorId: session.userId,
  });
  const result = databaseResult ?? clearDemoRiskReview({ userId: params.userId });
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
