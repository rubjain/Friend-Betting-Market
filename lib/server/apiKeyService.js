import crypto from "node:crypto";
import { hasDatabaseUrl, prisma } from "./prisma.js";

function hashKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) return [];
  const cleaned = scopes
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  return Array.from(new Set(cleaned));
}

function demoStore() {
  if (!globalThis.__agoraApiKeys) {
    globalThis.__agoraApiKeys = [];
  }
  return globalThis.__agoraApiKeys;
}

export function describeApiKey(record) {
  if (!record) return null;
  return {
    id: record.id,
    name: record.name,
    scopes: record.scopes || [],
    createdAt: record.createdAt,
    lastUsedAt: record.lastUsedAt ?? null,
    revokedAt: record.revokedAt ?? null,
  };
}

export async function createApiKey({ userId, name, scopes }) {
  const key = crypto.randomBytes(32).toString("base64url");
  const keyHash = hashKey(key);
  const normalizedScopes = normalizeScopes(scopes);
  const createdAt = new Date().toISOString();

  if (!hasDatabaseUrl()) {
    const record = {
      id: `key_${Date.now()}`,
      userId,
      name: name ? String(name) : "API key",
      scopes: normalizedScopes,
      keyHash,
      createdAt,
      lastUsedAt: null,
      revokedAt: null,
    };
    demoStore().unshift(record);
    return { ok: true, apiKey: describeApiKey(record), plaintextKey: key };
  }

  const record = await prisma.apiKey.create({
    data: {
      userId,
      name: name ? String(name) : "API key",
      scopes: normalizedScopes,
      keyHash,
    },
  });

  return {
    ok: true,
    apiKey: describeApiKey({
      ...record,
      createdAt: record.createdAt.toISOString(),
      lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
      revokedAt: record.revokedAt?.toISOString() ?? null,
    }),
    plaintextKey: key,
  };
}

export async function listApiKeys(userId) {
  if (!hasDatabaseUrl()) {
    return (demoStore() || [])
      .filter((k) => k.userId === userId)
      .map(describeApiKey);
  }

  const records = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return records.map((record) =>
    describeApiKey({
      ...record,
      createdAt: record.createdAt.toISOString(),
      lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
      revokedAt: record.revokedAt?.toISOString() ?? null,
    }),
  );
}

export async function revokeApiKey({ userId, apiKeyId }) {
  if (!hasDatabaseUrl()) {
    const store = demoStore();
    const record = store.find((k) => k.id === apiKeyId && k.userId === userId);
    if (!record) return { ok: false, message: "API key not found." };
    record.revokedAt = new Date().toISOString();
    return { ok: true, message: "API key revoked.", apiKey: describeApiKey(record) };
  }

  const record = await prisma.apiKey.findFirst({
    where: { id: apiKeyId, userId },
  });
  if (!record) return { ok: false, message: "API key not found." };

  const updated = await prisma.apiKey.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  return {
    ok: true,
    message: "API key revoked.",
    apiKey: describeApiKey({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      lastUsedAt: updated.lastUsedAt?.toISOString() ?? null,
      revokedAt: updated.revokedAt?.toISOString() ?? null,
    }),
  };
}

export async function authenticateApiKey(bearerToken) {
  const token = String(bearerToken || "").trim();
  if (!token) return { ok: false, message: "Missing API key." };
  const keyHash = hashKey(token);

  if (!hasDatabaseUrl()) {
    const record = (demoStore() || []).find((k) => k.keyHash === keyHash);
    if (!record || record.revokedAt) return { ok: false, message: "Invalid API key." };
    record.lastUsedAt = new Date().toISOString();
    return { ok: true, userId: record.userId, scopes: record.scopes || [] };
  }

  const record = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!record || record.revokedAt) return { ok: false, message: "Invalid API key." };

  await prisma.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { ok: true, userId: record.userId, scopes: record.scopes || [] };
}

export function hasScope(scopes, required) {
  const set = new Set((scopes || []).map((s) => String(s).toLowerCase()));
  return set.has(String(required).toLowerCase());
}

