import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../lib/server/auth.js";
import { requestDatabaseWithdrawal } from "../../../../lib/server/fundsService.js";
import { hasDatabaseUrl } from "../../../../lib/server/prisma.js";

export async function POST(request) {
  if (!hasDatabaseUrl()) {
    return NextResponse.json(
      { ok: false, message: "Persistent withdrawals require DATABASE_URL." },
      { status: 503 },
    );
  }

  const { session, response } = await requireAuthenticated(request);
  if (response) return response;
  const payload = await request.json();
  const result = await requestDatabaseWithdrawal({
    userId: session.userId,
    amount: payload.amount,
    method: payload.method,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
