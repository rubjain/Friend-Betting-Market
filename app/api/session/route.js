import { NextResponse } from "next/server";
import { getDemoState } from "../../../lib/server/demoStore.js";
import { getDatabaseState } from "../../../lib/server/dbState.js";
import {
  getSessionFromRequest,
  isDevAdminShortcutEnabled,
  loginUser,
  logoutUser,
  signupUser,
} from "../../../lib/server/auth.js";
import {
  SESSION_COOKIE_NAME,
  createSessionCookieValue,
  sessionCookieOptions,
} from "../../../lib/server/session.js";
import { hasDatabaseUrl } from "../../../lib/server/prisma.js";

async function stateForSession(session) {
  const state = hasDatabaseUrl()
    ? await getDatabaseState(undefined, session.userId)
    : getDemoState(session.userId);
  const demoAdminProfile = session.isAdmin && session.userId === "admin_1"
    ? {
        name: "Admin",
        username: "@admin",
        email: "admin@example.com",
      }
    : {};
  return {
    ...state,
    currentUser: {
      ...state.currentUser,
      ...demoAdminProfile,
      id: session.userId,
      isAdmin: session.isAdmin,
    },
  };
}

function getRequestRateLimitKey(request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const clientIp = forwardedFor.split(",")[0].trim();
  return clientIp || request.headers.get("x-real-ip") || "local";
}

export async function GET(request) {
  const session = await getSessionFromRequest(request);
  return NextResponse.json({
    session,
    devAdminShortcut: isDevAdminShortcutEnabled(),
    state: await stateForSession(session),
  });
}

export async function PATCH(request) {
  const payload = await request.json();
  const current = await getSessionFromRequest(request);
  if (!isDevAdminShortcutEnabled()) {
    return NextResponse.json(
      { ok: false, message: "The dev admin shortcut is disabled." },
      { status: 403 },
    );
  }
  const nextSession = {
    userId: payload.userId || current.userId,
    role: payload.isAdmin ? "admin" : "user",
  };
  const normalized = {
    role: nextSession.role,
    isAdmin: nextSession.role === "admin",
    userId: nextSession.userId,
  };
  const response = NextResponse.json({
    ok: true,
    session: normalized,
    devAdminShortcut: isDevAdminShortcutEnabled(),
    state: await stateForSession(normalized),
    message: normalized.isAdmin ? "Demo admin session enabled." : "Demo admin session disabled.",
  });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionCookieValue(normalized),
    sessionCookieOptions(),
  );
  return response;
}

export async function POST(request) {
  const payload = await request.json();
  const result =
    payload.mode === "signup"
      ? await signupUser({ ...payload, rateLimitKey: getRequestRateLimitKey(request) })
      : await loginUser({
          identifier: payload.identifier || payload.email || payload.username,
          password: payload.password,
          rateLimitKey: getRequestRateLimitKey(request),
        });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const response = NextResponse.json({
    ok: true,
    session: result.session,
    devAdminShortcut: isDevAdminShortcutEnabled(),
    user: result.user,
    emailVerificationToken:
      process.env.NODE_ENV === "production" ? undefined : result.emailVerificationToken,
    state: await stateForSession(result.session),
    message: result.message || (payload.mode === "signup" ? "Account created and signed in." : "Signed in."),
  });
  response.cookies.set(
    SESSION_COOKIE_NAME,
    createSessionCookieValue(result.session),
    sessionCookieOptions(),
  );
  return response;
}

export async function DELETE(request) {
  const session = await getSessionFromRequest(request);
  await logoutUser(session);

  const nextSession = {
    role: "user",
    isAdmin: false,
    userId: "user_1",
  };
  const response = NextResponse.json({
    ok: true,
    session: nextSession,
    devAdminShortcut: isDevAdminShortcutEnabled(),
    state: await stateForSession(nextSession),
    message: "Signed out.",
  });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
