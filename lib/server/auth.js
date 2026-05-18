import { NextResponse } from "next/server.js";
import { SESSION_TTL_SECONDS, getSessionFromCookieRequest, normalizeSession } from "./session.js";
import { defaultState } from "../defaultState.js";
import { ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email.js";
import {
  RATE_LIMITS,
  checkRateLimit,
  clearRateLimit,
  createAuthToken,
  consumeAuthToken,
  hashPassword,
  rateLimitMessage,
  recordRateLimitFailure,
  verifyPassword,
} from "./authSecurity.js";
import { hasAdminPermission } from "./adminPermissions.js";

const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
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
          { type: "LOCATION", status: "PLACEHOLDER" },
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
    expiresAt: record.expiresAt.toISOString(),
  });
}

export async function getSessionFromRequest(request) {
  const cookieSession = getSessionFromCookieRequest(request);
  const databaseSession = await sessionFromDatabase(cookieSession);
  if (databaseSession) {
    return databaseSession;
  }

  if (hasDatabaseUrl() && cookieSession.sessionId) {
    return normalizeSession({
      authenticated: false,
      sessionId: "",
      userId: defaultState.currentUser.id,
      role: "user",
    });
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

export async function requireAdminPermission(request, permission) {
  const { session, response } = await requireAdmin(request);
  if (response) return { session, response };
  if (!hasAdminPermission(session, permission)) {
    return {
      session,
      response: NextResponse.json(
        { ok: false, message: "Your admin role does not allow this action." },
        { status: 403 },
      ),
    };
  }

  return { session, response: null };
}

export async function requireAuthenticated(request) {
  const session = await getSessionFromRequest(request);
  if (!session.authenticated) {
    return {
      session,
      response: NextResponse.json(
        { ok: false, message: "Sign in before continuing." },
        { status: 401 },
      ),
    };
  }

  return { session, response: null };
}

export function isDevAdminShortcutEnabled() {
  return allowDevAdminShortcut();
}

export async function loginUser({ identifier, password, rateLimitKey }) {
  const limit = await checkRateLimit({
    scope: "login",
    identifier,
    requestKey: rateLimitKey,
    config: RATE_LIMITS.login,
  });
  if (!limit.ok) {
    return { ok: false, message: rateLimitMessage(limit) };
  }

  if (!hasDatabaseUrl()) {
    const account = getDemoCredentialForIdentifier(identifier);
    if (!account || password !== account.password) {
      await recordRateLimitFailure(limit.key, RATE_LIMITS.login);
      return { ok: false, message: "Use test@example.com or taylor@example.com with password123." };
    }
    await clearRateLimit(limit.key);
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
    await recordRateLimitFailure(limit.key, RATE_LIMITS.login);
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
    await recordRateLimitFailure(limit.key, RATE_LIMITS.login);
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
      await recordRateLimitFailure(limit.key, RATE_LIMITS.login);
      return { ok: false, message: "This account needs a password reset before sign-in." };
    }
  }

  if (!password) {
    await recordRateLimitFailure(limit.key, RATE_LIMITS.login);
    return { ok: false, message: "Enter your password." };
  }
  if (!verifyPassword(password, user.passwordHash)) {
    await recordRateLimitFailure(limit.key, RATE_LIMITS.login);
    return { ok: false, message: "Incorrect password." };
  }

  if (!user.id.startsWith("user_")) {
    const emailCheck = await prisma.verificationCheck.findUnique({
      where: { userId_type: { userId: user.id, type: "EMAIL" } },
    });
    if (emailCheck?.status === "PENDING") {
      return {
        ok: false,
        emailUnverified: true,
        email: user.email,
        message: "Please verify your email before signing in. Check your inbox for the verification link.",
      };
    }
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt,
    },
  });

  const session = normalizeSession({
    authenticated: true,
    sessionId,
    userId: user.id,
    role: user.role === "ADMIN" ? "admin" : "user",
    expiresAt: expiresAt.toISOString(),
  });
  await clearRateLimit(limit.key);
  return { ok: true, session, user: publicUser(user) };
}

export async function signupUser({ name, email, username, password, rateLimitKey }) {
  const signupLimit = await checkRateLimit({
    scope: "signup",
    identifier: email || username,
    requestKey: rateLimitKey,
    config: RATE_LIMITS.signup,
  });
  if (!signupLimit.ok) {
    return { ok: false, message: rateLimitMessage(signupLimit) };
  }

  if (!hasDatabaseUrl()) {
    return loginUser({ identifier: email || username, password });
  }

  await ensureDemoDatabaseSeed();
  const cleanedName = String(name || "").trim();
  const cleanedEmail = normalizeIdentifier(email);
  const cleanedUsername = normalizeUsername(username || cleanedEmail.split("@")[0]);

  if (cleanedName.length < 2) {
    await recordRateLimitFailure(signupLimit.key, RATE_LIMITS.signup);
    return { ok: false, message: "Enter a display name with at least 2 characters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    await recordRateLimitFailure(signupLimit.key, RATE_LIMITS.signup);
    return { ok: false, message: "Enter a valid email address." };
  }
  if (!cleanedUsername || cleanedUsername.length < 3) {
    await recordRateLimitFailure(signupLimit.key, RATE_LIMITS.signup);
    return { ok: false, message: "Enter a valid username." };
  }
  if (!password || password.length < 8) {
    await recordRateLimitFailure(signupLimit.key, RATE_LIMITS.signup);
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const passwordHash = hashPassword(password);

  try {
    const user = await prisma.user.create({
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
            { type: "LOCATION", status: "PLACEHOLDER" },
          ],
        },
      },
    });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const verification = await createAuthToken({
      userId: user.id,
      type: "EMAIL_VERIFICATION",
      metadata: { email: cleanedEmail, code },
    });
    await clearRateLimit(signupLimit.key);
    sendVerificationEmail({ to: cleanedEmail, token: verification.token, code }).catch(() => {});
    return {
      ok: true,
      pending: true,
      email: cleanedEmail,
      message: "Check your email for a 6-digit verification code.",
    };
  } catch {
    await recordRateLimitFailure(signupLimit.key, RATE_LIMITS.signup);
    return { ok: false, message: "That email or username is already in use." };
  }
}

export async function verifyEmailToken(token) {
  const consumed = await consumeAuthToken({ token, type: "EMAIL_VERIFICATION" });
  if (!consumed.ok) {
    return consumed;
  }

  const userId = consumed.record.userId;

  await prisma.verificationCheck.upsert({
    where: { userId_type: { userId, type: "EMAIL" } },
    update: {
      status: "VERIFIED",
      provider: "email-token",
      referenceId: consumed.record.id,
      metadata: {
        verifiedAt: new Date().toISOString(),
        email: consumed.record.metadata?.email ?? consumed.record.user.email,
      },
    },
    create: {
      userId,
      type: "EMAIL",
      status: "VERIFIED",
      provider: "email-token",
      referenceId: consumed.record.id,
      metadata: {
        verifiedAt: new Date().toISOString(),
        email: consumed.record.metadata?.email ?? consumed.record.user.email,
      },
    },
  });

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.userSession.create({ data: { id: sessionId, userId, expiresAt } });

  const user = consumed.record.user;
  const session = normalizeSession({
    authenticated: true,
    sessionId,
    userId,
    role: user.role === "ADMIN" ? "admin" : "user",
    expiresAt: expiresAt.toISOString(),
  });

  return { ok: true, session, user: publicUser(user), message: "Email verified. Welcome to Agora!" };
}

export async function verifyEmailCode({ email, code }) {
  if (!hasDatabaseUrl()) return { ok: false, message: "Invalid code." };
  const cleaned = String(email || "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: cleaned } });
  if (!user) return { ok: false, message: "Invalid code." };

  const record = await prisma.authToken.findFirst({
    where: { userId: user.id, type: "EMAIL_VERIFICATION", usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  if (!record || String(record.metadata?.code) !== String(code).trim()) {
    return { ok: false, message: "Invalid or expired code." };
  }

  await prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  await prisma.verificationCheck.upsert({
    where: { userId_type: { userId: user.id, type: "EMAIL" } },
    update: { status: "VERIFIED", provider: "email-code", referenceId: record.id, metadata: { verifiedAt: new Date().toISOString(), email: cleaned } },
    create: { userId: user.id, type: "EMAIL", status: "VERIFIED", provider: "email-code", referenceId: record.id, metadata: { verifiedAt: new Date().toISOString(), email: cleaned } },
  });

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.userSession.create({ data: { id: sessionId, userId: user.id, expiresAt } });
  const session = normalizeSession({
    authenticated: true, sessionId, userId: user.id,
    role: user.role === "ADMIN" ? "admin" : "user",
    expiresAt: expiresAt.toISOString(),
  });

  return { ok: true, session, user: publicUser(user), message: "Email verified. Welcome to Agora!" };
}

export async function requestPasswordReset({ identifier, rateLimitKey }) {
  if (!hasDatabaseUrl()) {
    return { ok: true, message: "Password reset is only available when a database is configured." };
  }

  const limit = await checkRateLimit({
    scope: "passwordReset",
    identifier,
    requestKey: rateLimitKey,
    config: RATE_LIMITS.passwordReset,
  });
  if (!limit.ok) {
    return { ok: false, message: rateLimitMessage(limit) };
  }

  const cleaned = normalizeIdentifier(identifier);
  const user = await prisma.user.findFirst({
    where: cleaned.startsWith("@")
      ? { username: cleaned }
      : { OR: [{ email: cleaned }, { username: normalizeUsername(cleaned) }] },
  });

  if (!user) {
    await recordRateLimitFailure(limit.key, RATE_LIMITS.passwordReset);
    return {
      ok: true,
      message: "If that account exists, a reset link is ready to send.",
    };
  }

  const reset = await createAuthToken({
    userId: user.id,
    type: "PASSWORD_RESET",
    metadata: { identifier: cleaned },
  });
  await clearRateLimit(limit.key);

  sendPasswordResetEmail({ to: user.email, token: reset.token }).catch(() => {});

  return {
    ok: true,
    passwordResetToken: reset.token,
    message: "Check your email for a password reset link.",
  };
}

export async function requestAccountRecovery({ identifier, rateLimitKey }) {
  if (!hasDatabaseUrl()) {
    return { ok: true, message: "Account recovery is only available when a database is configured." };
  }

  const limit = await checkRateLimit({
    scope: "accountRecovery",
    identifier,
    requestKey: rateLimitKey,
    config: RATE_LIMITS.accountRecovery,
  });
  if (!limit.ok) {
    return { ok: false, message: rateLimitMessage(limit) };
  }

  const cleaned = normalizeIdentifier(identifier);
  const user = await prisma.user.findFirst({
    where: cleaned.startsWith("@")
      ? { username: cleaned }
      : { OR: [{ email: cleaned }, { username: normalizeUsername(cleaned) }] },
  });

  if (!user) {
    await recordRateLimitFailure(limit.key, RATE_LIMITS.accountRecovery);
    return {
      ok: true,
      message: "If that account exists, recovery instructions can be sent.",
    };
  }

  const recovery = await createAuthToken({
    userId: user.id,
    type: "ACCOUNT_RECOVERY",
    metadata: { identifier: cleaned },
  });
  await clearRateLimit(limit.key);

  return {
    ok: true,
    accountRecoveryToken: recovery.token,
    message: "Account recovery token created.",
  };
}

export async function completeAccountRecoveryWithToken({ token, password }) {
  if (!password || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const consumed = await consumeAuthToken({ token, type: "ACCOUNT_RECOVERY" });
  if (!consumed.ok) {
    return consumed;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: consumed.record.userId },
      data: { passwordHash: hashPassword(password), frozen: false },
    }),
    prisma.userSession.deleteMany({ where: { userId: consumed.record.userId } }),
    prisma.auditTrail.create({
      data: {
        actorId: consumed.record.userId,
        action: "ACCOUNT_RECOVERY_COMPLETED",
        metadata: { tokenId: consumed.record.id },
      },
    }),
  ]);

  return {
    ok: true,
    message: "Account recovered. Sign in with your new password.",
  };
}

export async function resetPasswordWithToken({ token, password }) {
  if (!password || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  const consumed = await consumeAuthToken({ token, type: "PASSWORD_RESET" });
  if (!consumed.ok) {
    return consumed;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: consumed.record.userId },
      data: { passwordHash: hashPassword(password) },
    }),
    prisma.userSession.deleteMany({ where: { userId: consumed.record.userId } }),
    prisma.auditTrail.create({
      data: {
        actorId: consumed.record.userId,
        action: "PASSWORD_RESET_COMPLETED",
        metadata: { tokenId: consumed.record.id },
      },
    }),
  ]);

  return { ok: true, message: "Password updated. Sign in with the new password." };
}

export async function logoutUser(session) {
  if (hasDatabaseUrl() && session?.sessionId) {
    await prisma.userSession.delete({ where: { id: session.sessionId } }).catch(() => {});
  }
}
