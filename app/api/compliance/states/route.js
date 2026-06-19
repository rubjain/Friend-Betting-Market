import { NextResponse } from "next/server";
import { listAllStates } from "../../../../lib/stateCompliance.js";

export async function GET() {
  return NextResponse.json({
    ok: true,
    states: listAllStates(),
  });
}
