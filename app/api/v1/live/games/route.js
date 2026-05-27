import { NextResponse } from "next/server";
import { getLiveGamesPayload } from "../../../../../lib/liveGameCatalog.js";
import { betaRuntimeError } from "../../../../../lib/server/betaRuntime.js";

export async function GET() {
  const runtimeError = betaRuntimeError();
  if (runtimeError) {
    return NextResponse.json(runtimeError, { status: 503 });
  }

  const payload = await getLiveGamesPayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
