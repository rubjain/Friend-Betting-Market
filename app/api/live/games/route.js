import { NextResponse } from "next/server";
import { getLiveGamesPayload } from "../../../../lib/liveGameCatalog.js";

export async function GET() {
  const payload = await getLiveGamesPayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
