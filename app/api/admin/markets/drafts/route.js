import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import { listDraftMarkets } from "../../../../../lib/server/draftMarketGenerator";

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const drafts = await listDraftMarkets();
  return NextResponse.json({ ok: true, drafts });
}
