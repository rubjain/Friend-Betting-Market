import { NextResponse } from "next/server";
import { getLiveGamesPayload } from "../../../../lib/liveGameCatalog.js";

export async function GET() {
  const payload = getLiveGamesPayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
