import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../../lib/server/auth.js";
import { sellDatabaseBet } from "../../../../../lib/server/betService.js";
import { sellDemoBet } from "../../../../../lib/server/demoStore.js";

export async function POST(request, { params }) {
  const session = await getSessionFromRequest(request);
  const userId = session.userId;
  const { betId } = params;

  const databaseResult = await sellDatabaseBet({ betId, userId });
  const result = databaseResult ?? sellDemoBet({ betId, userId });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
