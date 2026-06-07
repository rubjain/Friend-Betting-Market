import { NextResponse } from "next/server";
import { syncEspnMarketsToDb } from "../../../../lib/server/espnMarketSync.js";
import { prisma, hasDatabaseUrl } from "../../../../lib/server/prisma.js";

function authorized(request) {
  const secret = process.env.CRON_SECRET || process.env.AGORA_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ ok: false, message: "Database not configured." }, { status: 400 });
  }

  await syncEspnMarketsToDb(prisma);
  return NextResponse.json({ ok: true, message: "ESPN market sync completed." });
}
