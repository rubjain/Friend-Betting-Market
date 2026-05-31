import crypto from "node:crypto";
import { hasDatabaseUrl, prisma } from "./prisma.js";

export const AUTH_TOKEN_TTL_MS = {
  EMAIL_VERIFICATION: 1000 * 60 * 60 * 24,
  PASSWORD_RESET: 1000 * 60 * 30,
  ACCOUNT_RECOVERY: 1000 * 60 * 60,
};

export const RATE_LIMITS = {
  login: { max: 5, windowMs: 15 * 60 * 1000 },
  signup: { max: 3, windowMs: 60 * 60 * 1000 },
  passwordReset: { max: 3, windowMs: 60 * 60 * 1000 },
  accountRecovery: { max: 3, windowMs: 60 * 60 * 1000 },
  /** Per API key (Bearer) for /api/v1/* */
  publicApiKey: { max: 120, windowMs: 60 * 1000 },
  /** Per user + IP for cookie-authenticated /api/v1/* */
  publicApiSession: { max: 90, windowMs: 60 * 1000 },
};

const memoryRateLimitBuckets = new Map();

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeScope(scope) {
  return String(scope || "general").trim().toLowerCase().replace(/[^a-z0-9_.:-]/g, "_");
}

export function makeRateLimitKey(scope, identifier, requestKey = "unknown") {
  const cleanedScope = normalizeScope(scope);
  const cleanedIdentifier = String(identifier || "blank").trim().toLowerCase();
  const cleanedRequestKey = String(requestKey || "unknown").trim().toLowerCase();
  return `${cleanedScope}:${cleanedRequestKey}:${cleanedIdentifier}`;
}

export async function checkRateLimit({ scope, identifier, requestKey, userId, config }) {
  const settings = config ?? RATE_LIMITS[scope] ?? RATE_LIMITS.login;
  const key = makeRateLimitKey(scope, identifier, requestKey);
  const now = Date.now();
  const resetAt = new Date(now + settings.windowMs);

  if (!hasDatabaseUrl()) {
    const entry = memoryRateLimitBuckets.get(key);
    if (!entry || entry.resetAt <= now) {
      memoryRateLimitBuckets.set(key, { count: 0, resetAt: now + settings.windowMs });
      return { ok: true, key, remaining: settings.max };
    }
    if (entry.count >= settings.max) {
      return {
        ok: false,
        key,
        retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
      };
    }
    return { ok: true, key, remaining: Math.max(0, settings.max - entry.count) };
  }

  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (!existing || existing.resetAt <= new Date()) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      update: { count: 0, resetAt, userId: userId ?? null, scope: normalizeScope(scope) },
      create: { key, count: 0, resetAt, userId: userId ?? null, scope: normalizeScope(scope) },
    });
    return { ok: true, key, remaining: settings.max };
  }

  if (existing.count >= settings.max) {
    return {
      ok: false,
      key,
      retryAfterSeconds: Math.ceil((existing.resetAt.getTime() - now) / 1000),
    };
  }

  return { ok: true, key, remaining: Math.max(0, settings.max - existing.count) };
}

export async function recordRateLimitFailure(key, config = RATE_LIMITS.login) {
  if (!key) return;
  const now = Date.now();

  if (!hasDatabaseUrl()) {
    const entry = memoryRateLimitBuckets.get(key) ?? { count: 0, resetAt: now + config.windowMs };
    memoryRateLimitBuckets.set(key, {
      count: entry.count + 1,
      resetAt: entry.resetAt > now ? entry.resetAt : now + config.windowMs,
    });
    return;
  }

  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  }).catch(() => {});
}

export async function clearRateLimit(key) {
  if (!key) return;
  if (!hasDatabaseUrl()) {
    memoryRateLimitBuckets.delete(key);
    return;
  }
  await prisma.rateLimitBucket.delete({ where: { key } }).catch(() => {});
}

export function rateLimitMessage(limit) {
  const minutes = Math.max(1, Math.ceil((limit.retryAfterSeconds || 60) / 60));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export async function createAuthToken({ userId, type, metadata }) {
  if (!hasDatabaseUrl()) {
    return { token: "", expiresAt: null };
  }
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (AUTH_TOKEN_TTL_MS[type] ?? AUTH_TOKEN_TTL_MS.ACCOUNT_RECOVERY));
  await prisma.authToken.create({
    data: {
      userId,
      type,
      tokenHash: tokenHash(token),
      expiresAt,
      metadata,
    },
  });
  return { token, expiresAt };
}

export async function consumeAuthToken({ token, type }) {
  if (!hasDatabaseUrl() || !token) {
    return { ok: false, message: "Invalid or expired token." };
  }

  const record = await prisma.authToken.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true },
  });

  if (!record || record.type !== type || record.usedAt || record.expiresAt <= new Date()) {
    return { ok: false, message: "Invalid or expired token." };
  }

  await prisma.authToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { ok: true, record };
}

export async function pruneExpiredAuthSecurityRows(client = prisma) {
  if (!hasDatabaseUrl()) return;
  const now = new Date();
  await Promise.all([
    client.authToken.deleteMany({ where: { expiresAt: { lt: now }, usedAt: { not: null } } }),
    client.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } }),
  ]);
}
