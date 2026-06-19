import { NextResponse } from "next/server";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "../../../../lib/server/auth.js";

function getRequestRateLimitKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const clientIp = forwardedFor.split(",")[0].trim();
  return clientIp || request.headers.get("x-real-ip") || "local";
}

export async function POST(request) {
  const payload = await request.json();
  const result = await requestPasswordReset({
    identifier: payload.identifier || payload.email || payload.username,
    rateLimitKey: getRequestRateLimitKey(request),
  });
  return NextResponse.json(
    {
      ...result,
      passwordResetToken:
        process.env.NODE_ENV === "production" ? undefined : result.passwordResetToken,
    },
    { status: result.ok ? 200 : 400 },
  );
}

export async function PATCH(request) {
  const payload = await request.json();
  const result = await resetPasswordWithToken({
    token: payload.token,
    password: payload.password,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
