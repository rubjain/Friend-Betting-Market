import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import { grantDatabaseBonus } from "../../../../../lib/server/fundsService.js";
import { grantDemoBonus } from "../../../../../lib/server/demoStore.js";

export async function POST(request) {
  const { session, response } = await requireAdmin(request);
  if (response) return response;

  const result = (await grantDatabaseBonus({ userId: session.userId })) ?? grantDemoBonus();
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
