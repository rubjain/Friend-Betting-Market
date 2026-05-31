import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../lib/server/adminPermissions.js";
import { runMarketGenerators } from "../../../../../lib/server/draftMarketGenerator";

export async function POST(request) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.MARKET_MODERATION);
  if (response) return response;

  const result = await runMarketGenerators();
  return NextResponse.json({
    ok: result.errored === 0,
    message: `Generated ${result.created} draft markets. Skipped ${result.skipped}. Errors ${result.errored}.`,
    ...result,
  });
}
