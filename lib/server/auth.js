import { NextResponse } from "next/server.js";
import crypto from "node:crypto";
import { getSessionFromCookieRequest, normalizeSession } from "./session.js";
import { defaultState } from "../defaultState.js";
import { ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 5;
const loginAttempts = new Map();
const demoCredentials = [
  {
    id: "admin_1",
    email: "admin@example.com",
    username: "@admin",
    password: "password123",
    role: "ADMIN",
  },
  {
    id: "user_1",
    email: "test@example.com",
    username: "@test",
    password: "password123",
  },
  {
    id: "user_2",
    email: "taylor@example.com",
    username: "@taylor",
    password: "password123",
  },
];

const demoAdminUser = {
  id: "admin_1",
  name: "Admin",
  username: "@admin",
  email: "admin@example.com",
  role: "ADMIN",
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
}

function allowDevAdminShortcut() {
  return process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT === "1";
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUsername(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");

  return cleaned ? `@${cleaned}` : "";
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: String(user.role || "USER").toLowerCase(),
    isAdmin: user.role === "ADMIN",
  };
}

function getDemoCredentialForIdentifier(identifier) {
  const cleaned = normalizeIdentifier(identifier);
  return demoCredentials.find(
    (item) => item.email === cleaned || item.username === normalizeUsername(cleaned),
  );
}

function loginRateLimitKey(identifier, requestKey = "unknown") {
  return `${requestKey}:${normalizeIdentifier(identifier) || "blank"}`;
}

function checkLoginRateLimit(identifier, requestKey) {
  const key = loginRateLimitKey(identifier, requestKey);
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS });
    return { ok: true, key };
  }
  if (entry.count >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      ok: false,
      key,
      message: `Too many sign-in attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
    };
  }
  return { ok: true, key };
}

function recordFailedLogin(key) {
  if (!key) return;
  const now = Date.now();
  const entry = loginAttempts.get(key) ?? { count: 0, resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS };
  loginAttempts.set(key, {
    count: entry.count + 1,
    resetAt: entry.resetAt > now ? entry.resetAt : now + LOGIN_RATE_LIMIT_WINDOW_MS,
  });
}

function clearLoginRateLimit(key) {
  if (key) {
    loginAttempts.delete(key);
  }
}

async function ensureDemoAdminUser() {
  if (!hasDatabaseUrl()) {
    return null;
  }

  return prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { role: "ADMIN" },
    create: {
      id: "admin_1",
      name: "Admin",
      username: "@admin",
      email: "admin@example.com",
      passwordHash: hashPassword("password123"),
      role: "ADMIN",
      balanceAccounts: {
        create: [
          { currency: "WITHDRAWABLE", balance: 0 },
          { currency: "BONUS", balance: 0 },
        ],
      },
      verificationChecks: {
        create: [
          { type: "EMAIL", status: "VERIFIED" },
          { type: "PHONE", status: "PLACEHOLDER" },
          { type: "IDENTITY", status: "PLACEHOLDER" },
          { type: "PAYMENT", status: "PLACEHOLDER" },
          { type: "DEVICE", status: "PLACEHOLDER" },
        ],
      },
    },
  });
}

async function sessionFromDatabase(cookieSession) {
  if (!hasDatabaseUrl() || !cookieSession.sessionId) {
    return null;
  }

  const record = await prisma.userSession.findUnique({
    where: { id: cookieSession.sessionId },
    include: { user: true },
  });

  if (!record || record.expiresAt <= new Date()) {
    if (record) {
      await prisma.userSession.delete({ where: { id: record.id } }).catch(() => {});
    }
    return null;
  }

  return normalizeSession({
    authenticated: true,
    sessionId: record.id,
    userId: record.userId,
    role: record.user.role === "ADMIN" ? "admin" : "user",
  });
}

export async function getSessionFromRequest(request) {
  const cookieSession = getSessionFromCookieRequest(request);
  const databaseSession = await sessionFromDatabase(cookieSession);
  if (databaseSession) {
    return databaseSession;
  }

  const headerAdmin =
    allowDevAdminShortcut() && request.headers.get("x-friendmarket-role") === "admin";
  const role = cookieSession.isAdmin || headerAdmin
    ? "admin"
    : "user";

  return normalizeSession({
    role,
    authenticated: cookieSession.authenticated,
    sessionId: cookieSession.sessionId,
    userId: cookieSession.userId || "user_1",
  });
}

export async function requireAdmin(request) {
  const session = await getSessionFromRequest(request);
  if (!session.isAdmin) {
    return {
      session,
      response: NextResponse.json(
        { ok: false, message: "Admin role is required for this action." },
        { status: 403 },
      ),
    };
  }

  return { session, response: null };
}

export function isDevAdminShortcutEnabled() {
  return allowDevAdminShortcut();
}

export async function loginUser({ identifier, password, rateLimitKey }) {
  const limit = checkLoginRateLimit(identifier, rateLimitKey);
  if (!limit.ok) {
    return { ok: false, message: limit.message };
  }

  if (!hasDatabaseUrl()) {
    const account = getDemoCredentialForIdentifier(identifier);
    if (!account || password !== account.password) {
      recordFailedLogin(limit.key);
      return { ok: false, message: "Use test@example.com or taylor@example.com with password123." };
    }
    clearLoginRateLimit(limit.key);
    const fallback = normalizeSession({
      authenticated: true,
      userId: account.id,
      role: account.role === "ADMIN" ? "admin" : "user",
    });
    const user =
      account.role === "ADMIN"
        ? demoAdminUser
        : defaultState.users.find((item) => item.id === account.id) ?? defaultState.currentUser;
    return { ok: true, session: fallback, user: publicUser({ ...user, role: account.role || "USER" }) };
  }

  const cleaned = normalizeIdentifier(identifier);
  if (!cleaned) {
    recordFailedLogin(limit.key);
    return { ok: false, message: "Enter an email address or username." };
  }

  await ensureDemoDatabaseSeed();
  if (cleaned === "admin@example.com" || cleaned === "@admin") {
    await ensureDemoAdminUser();
  }
  const user = await prisma.user.findFirst({
    where: cleaned.startsWith("@")
      ? { username: cleaned }
      : { OR: [{ email: cleaned }, { username: normalizeUsername(cleaned) }] },
  });

  if (!user) {
    recordFailedLogin(limit.key);
    return { ok: false, message: "No account was found for that email or username." };
  }

  if (!user.passwordHash) {
    const demoAccount = getDemoCredentialForIdentifier(cleaned);
    if (demoAccount && password === demoAccount.password) {
      user.passwordHash = hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: user.passwordHash },
      });
    } else {
      recordFailedLogin(limit.key);
      return { ok: false, message: "This account needs a password reset before sign-in." };
    }
  }

  if (!password) {
    recordFailedLogin(limit.key);
    return { ok: false, message: "Enter your password." };
  }
  if (!verifyPassword(password, user.passwordHash)) {
    recordFailedLogin(limit.key);
    return { ok: false, message: "Incorrect password." };
  }

  const sessionId = crypto.randomUUID();
  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  const session = normalizeSession({
    authenticated: true,
    sessionId,
    userId: user.id,
    role: user.role === "ADMIN" ? "admin" : "user",
  });
  clearLoginRateLimit(limit.key);
  return { ok: true, session, user: publicUser(user) };
}

export async function signupUser({ name, email, username, password }) {
  if (!hasDatabaseUrl()) {
    return loginUser({ identifier: email || username, password });
  }

  await ensureDemoDatabaseSeed();
  const cleanedName = String(name || "").trim();
  const cleanedEmail = normalizeIdentifier(email);
  const cleanedUsername = normalizeUsername(username || cleanedEmail.split("@")[0]);

  if (cleanedName.length < 2) {
    return { ok: false, message: "Enter a display name with at least 2 characters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!cleanedUsername || cleanedUsername.length < 3) {
    return { ok: false, message: "Enter a valid username." };
  }
  if (!password || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const passwordHash = hashPassword(password);

  try {
    await prisma.user.create({
      data: {
        name: cleanedName,
        email: cleanedEmail,
        username: cleanedUsername,
        passwordHash,
        balanceAccounts: {
          create: [
            { currency: "WITHDRAWABLE", balance: 0 },
            { currency: "BONUS", balance: 0 },
          ],
        },
        verificationChecks: {
          create: [
            { type: "EMAIL", status: "PENDING" },
            { type: "PHONE", status: "PLACEHOLDER" },
            { type: "IDENTITY", status: "PLACEHOLDER" },
            { type: "PAYMENT", status: "PLACEHOLDER" },
            { type: "DEVICE", status: "PLACEHOLDER" },
          ],
        },
      },
    });
  } catch {
    return { ok: false, message: "That email or username is already in use." };
  }

  return loginUser({ identifier: cleanedEmail, password });
}

export async function logoutUser(session) {
  if (hasDatabaseUrl() && session?.sessionId) {
    await prisma.userSession.delete({ where: { id: session.sessionId } }).catch(() => {});
  }
}
