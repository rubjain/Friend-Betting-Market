import { NextResponse } from "next/server";
import { changePassword, requireAuthenticated } from "../../../../lib/server/auth.js";

function getRequestRateLimitKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const clientIp = forwardedFor.split(",")[0].trim();
  return clientIp || request.headers.get("x-real-ip") || "local";
}

export async function PATCH(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const result = await changePassword({
    userId: session.userId,
    currentPassword: payload.currentPassword,
    newPassword: payload.newPassword || payload.password,
    rateLimitKey: getRequestRateLimitKey(request),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
