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
import { getAdminLevel, getAdminPermissions } from "../../../lib/server/adminPermissions.js";
import {
  SESSION_COOKIE_NAME,
  createSessionCookieValue,
  getSessionFromCookieRequest,
  sessionCookieOptions,
  shouldClearStaleDatabaseSessionCookie,
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

function sessionPayload(session) {
  return {
    ...session,
    adminLevel: getAdminLevel(session),
    adminPermissions: Array.from(getAdminPermissions(session)),
  };
}

export async function GET(request) {
  const cookieSession = getSessionFromCookieRequest(request);
  const session = await getSessionFromRequest(request);
  const clearStaleCookie = shouldClearStaleDatabaseSessionCookie(
    hasDatabaseUrl(),
    cookieSession,
    session,
  );
  const response = NextResponse.json({
    session: sessionPayload(session),
    devAdminShortcut: isDevAdminShortcutEnabled(),
    state: await stateForSession(session),
    sessionExpired: clearStaleCookie,
  });
  if (clearStaleCookie) {
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      ...sessionCookieOptions(),
      maxAge: 0,
    });
  }
  return response;
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
    authenticated: true,
  };
  const response = NextResponse.json({
    ok: true,
    session: sessionPayload(normalized),
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
    session: sessionPayload(result.session),
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
    authenticated: false,
  };
  const response = NextResponse.json({
    ok: true,
    session: sessionPayload(nextSession),
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
