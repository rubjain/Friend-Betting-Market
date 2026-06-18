import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { submitLocationVerification } from "../../../../../lib/server/verificationService.js";

export async function POST(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const result = await submitLocationVerification({
    userId: session.userId,
    declaredState: payload.declaredState || payload.state,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
