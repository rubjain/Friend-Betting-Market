import { NextResponse } from "next/server";
import {
  completeAccountRecoveryWithToken,
  requestAccountRecovery,
} from "../../../../lib/server/auth.js";

function getRequestRateLimitKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const clientIp = forwardedFor.split(",")[0].trim();
  return clientIp || request.headers.get("x-real-ip") || "local";
}

export async function POST(request) {
  const payload = await request.json();
  const result = await requestAccountRecovery({
    identifier: payload.identifier || payload.email || payload.username,
    rateLimitKey: getRequestRateLimitKey(request),
  });
  return NextResponse.json(
    {
      ...result,
      accountRecoveryToken:
        process.env.NODE_ENV === "production" ? undefined : result.accountRecoveryToken,
    },
    { status: result.ok ? 200 : 400 },
  );
}

export async function PATCH(request) {
  const payload = await request.json();
  const result = await completeAccountRecoveryWithToken({
    token: payload.token,
    password: payload.password,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
