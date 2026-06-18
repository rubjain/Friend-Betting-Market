import { NextResponse } from "next/server";
import { betaRuntimeError } from "../../../../../../lib/server/betaRuntime.js";

export async function GET(request, context) {
  const runtimeError = betaRuntimeError();
  if (runtimeError) {
    return NextResponse.json(runtimeError, { status: 503 });
  }

  const { GET: getPriceHistory } = await import(
    "../../../../markets/[marketId]/price-history/route.js"
  );
  return getPriceHistory(request, context);
}
