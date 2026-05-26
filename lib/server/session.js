import crypto from "node:crypto";
import { agoraSessionSecret } from "./env.js";

export const SESSION_COOKIE_NAME = "agora-demo-session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_EXPIRY_WARNING_MS = 1000 * 60 * 15;

const defaultSession = {
  role: "user",
  userId: "user_1",
  sessionId: "",
  expiresAt: "",
};

function getSecret() {
  return agoraSessionSecret();
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
  const expiry = getSessionExpiryState(session.expiresAt);
  return {
    role,
    isAdmin: role === "admin",
    userId: session.userId || defaultSession.userId,
    sessionId: session.sessionId || "",
    authenticated: Boolean(session.authenticated || session.sessionId),
    expiresAt: expiry.expiresAt,
    expiresSoon: expiry.expiresSoon,
    secondsUntilExpiry: expiry.secondsUntilExpiry,
  };
}

export function createSessionCookieValue(session) {
  const normalized = normalizeSession(session);
  const payload = base64UrlEncode(JSON.stringify({
    role: normalized.role,
    userId: normalized.userId,
    sessionId: normalized.sessionId,
    authenticated: normalized.authenticated,
    expiresAt: normalized.expiresAt,
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

/** When using Postgres sessions, a cookie can still carry an old sessionId after expiry or logout server-side. */
export function shouldClearStaleDatabaseSessionCookie(hasDatabase, cookieSession, resolvedSession) {
  return (
    Boolean(hasDatabase) &&
    Boolean(cookieSession?.sessionId) &&
    (!resolvedSession.authenticated || !resolvedSession.sessionId)
  );
}

export function getSessionExpiryState(expiresAt, now = Date.now(), warningMs = SESSION_EXPIRY_WARNING_MS) {
  const expiryMs = Date.parse(expiresAt || "");
  if (!Number.isFinite(expiryMs)) {
    return {
      expiresAt: "",
      expiresSoon: false,
      secondsUntilExpiry: null,
    };
  }

  const msUntilExpiry = Math.max(0, expiryMs - now);
  return {
    expiresAt: new Date(expiryMs).toISOString(),
    expiresSoon: msUntilExpiry > 0 && msUntilExpiry <= warningMs,
    secondsUntilExpiry: Math.ceil(msUntilExpiry / 1000),
  };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
