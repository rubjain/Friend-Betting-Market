import { NextResponse } from "next/server";
import { verifyEmailToken, verifyEmailCode } from "../../../../lib/server/auth.js";
import { getAdminLevel, getAdminPermissions } from "../../../../lib/server/adminPermissions.js";
import { SESSION_COOKIE_NAME, createSessionCookieValue, sessionCookieOptions } from "../../../../lib/server/session.js";
import { getDatabaseState } from "../../../../lib/server/dbState.js";

async function buildVerifyResponse(result) {
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const state = await getDatabaseState(undefined, result.session.userId);
  const response = NextResponse.json({
    ok: true,
    session: {
      ...result.session,
      adminLevel: getAdminLevel(result.session),
      adminPermissions: Array.from(getAdminPermissions(result.session)),
    },
    user: result.user,
    state,
    message: result.message,
  });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionCookieValue(result.session),
    sessionCookieOptions(),
  );

  return response;
}

export async function POST(request) {
  const payload = await request.json();

  if (payload.code && payload.email) {
    return buildVerifyResponse(await verifyEmailCode({ email: payload.email, code: payload.code }));
  }

  return buildVerifyResponse(await verifyEmailToken(payload.token));
}
