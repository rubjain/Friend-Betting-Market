import { NextResponse } from "next/server";
import { syncEspnMarketsToDb } from "../../../../lib/server/espnMarketSync.js";
import { prisma, hasDatabaseUrl } from "../../../../lib/server/prisma.js";
import { isAuthorizedCronRequest } from "../../../../lib/server/cronAuth.js";

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: false, message: "Database not configured." }, { status: 400 });
  }

  await syncEspnMarketsToDb(prisma);
  return NextResponse.json({ ok: true, message: "ESPN market sync completed." });
}
