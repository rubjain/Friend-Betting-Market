import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import { runMarketGenerators } from "../../../../../lib/server/draftMarketGenerator";

export async function POST(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const result = await runMarketGenerators();
  return NextResponse.json({
    ok: result.errored === 0,
    message: `Generated ${result.created} draft markets. Skipped ${result.skipped}. Errors ${result.errored}.`,
    ...result,
  });
}
