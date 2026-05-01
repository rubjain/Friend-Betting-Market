import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import { updateDraftMarket } from "../../../../../lib/server/draftMarketGenerator";

export async function PATCH(request, { params }) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const payload = await request.json();
  const draft = await updateDraftMarket(params.marketId, {
    question: payload.question,
    closeTime: payload.closeTime,
    resolutionSource: payload.resolutionSource,
    resolutionRules: payload.resolutionRules,
  });

  if (!draft) {
    return NextResponse.json(
      { ok: false, message: "Draft market was not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Draft market updated.",
    draft,
  });
}
