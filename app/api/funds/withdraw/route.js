import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../../lib/server/auth.js";
import { requestDatabaseWithdrawal } from "../../../../lib/server/fundsService.js";

export async function POST(request) {
  const session = await getSessionFromRequest(request);
  const payload = await request.json();
  const result = await requestDatabaseWithdrawal({
    userId: session.userId,
    amount: payload.amount,
    method: payload.method,
  });

  if (!result) {
    return NextResponse.json(
      { ok: false, message: "Persistent withdrawals require DATABASE_URL." },
      { status: 503 },
    );
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
