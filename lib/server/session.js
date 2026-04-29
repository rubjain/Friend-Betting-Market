import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "friendmarket-demo-session";

const defaultSession = {
  role: "user",
  userId: "user_1",
  sessionId: "",
};

function getSecret() {
  return process.env.FRIENDMARKET_SESSION_SECRET || "friendmarket-local-demo-secret";
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function normalizeSession(session = {}) {
  const role = session.role === "admin" ? "admin" : "user";
  return {
    role,
    isAdmin: role === "admin",
    userId: session.userId || defaultSession.userId,
    sessionId: session.sessionId || "",
    authenticated: Boolean(session.authenticated || session.sessionId),
  };
}

export function createSessionCookieValue(session) {
  const normalized = normalizeSession(session);
  const payload = base64UrlEncode(JSON.stringify({
    role: normalized.role,
    userId: normalized.userId,
    sessionId: normalized.sessionId,
    authenticated: normalized.authenticated,
  }));
  return `${payload}.${sign(payload)}`;
}

export function parseSessionCookieValue(value) {
  if (!value || !value.includes(".")) {
    return normalizeSession(defaultSession);
  }

  const [payload, signature] = value.split(".");
  const expected = sign(payload);
  const valid =
    signature &&
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!valid) {
    return normalizeSession(defaultSession);
  }

  try {
    return normalizeSession(JSON.parse(base64UrlDecode(payload)));
  } catch {
    return normalizeSession(defaultSession);
  }
}

export function getSessionCookieFromRequest(request) {
  if (request.cookies?.get) {
    return request.cookies.get(SESSION_COOKIE_NAME)?.value;
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1)) : "";
}

export function getSessionFromCookieRequest(request) {
  return parseSessionCookieValue(getSessionCookieFromRequest(request));
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
