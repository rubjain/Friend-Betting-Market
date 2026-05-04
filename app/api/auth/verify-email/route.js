import { NextResponse } from "next/server";
import { verifyEmailToken } from "../../../../lib/server/auth.js";

export async function POST(request) {
  const payload = await request.json();
  const result = await verifyEmailToken(payload.token);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
