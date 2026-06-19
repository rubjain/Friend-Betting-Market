import crypto from "node:crypto";
import { hasDatabaseUrl, prisma } from "./prisma.js";

function demoStore() {
  if (!globalThis.__agoraStrategies) {
    globalThis.__agoraStrategies = [];
  }
  return globalThis.__agoraStrategies;
}

function demoExecStore() {
  if (!globalThis.__agoraStrategyExecutions) {
    globalThis.__agoraStrategyExecutions = [];
  }
  return globalThis.__agoraStrategyExecutions;
}

function nowIso() {
  return new Date().toISOString();
}

export async function listStrategies(userId) {
  if (!hasDatabaseUrl()) {
    return demoStore().filter((s) => s.userId === userId);
  }
  return prisma.strategy.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listStrategyExecutions(userId, { limit = 50 } = {}) {
  const take = Math.min(200, Math.max(1, Number(limit) || 50));
  if (!hasDatabaseUrl()) {
    return demoExecStore()
      .filter((e) => e.userId === userId)
      .slice(0, take);
  }
  return prisma.strategyExecution.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: { strategy: { select: { id: true, name: true, mode: true } } },
  });
}

export async function listActiveStrategies() {
  if (!hasDatabaseUrl()) {
    return demoStore().filter((s) => String(s.status || "DRAFT").toUpperCase() === "ACTIVE");
  }

  return prisma.strategy.findMany({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createStrategy({ userId, name, mode, status, type, config }) {
  const record = {
    userId,
    name: String(name || "Strategy"),
    mode: mode || "PAPER",
    status: status || "DRAFT",
    type: type || "RULES",
    config: config ?? { rules: [] },
  };

  if (!hasDatabaseUrl()) {
    const created = {
      id: `strat_${crypto.randomBytes(8).toString("hex")}`,
      ...record,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      promotedFromId: null,
    };
    demoStore().unshift(created);
    return { ok: true, strategy: created };
  }

  const created = await prisma.strategy.create({ data: record });
  return { ok: true, strategy: created };
}

export async function getStrategy({ userId, strategyId }) {
  if (!hasDatabaseUrl()) {
    const record = demoStore().find((s) => s.id === strategyId && s.userId === userId);
    return record || null;
  }
  return prisma.strategy.findFirst({ where: { id: strategyId, userId } });
}

export async function updateStrategy({ userId, strategyId, patch }) {
  if (!hasDatabaseUrl()) {
    const store = demoStore();
    const idx = store.findIndex((s) => s.id === strategyId && s.userId === userId);
    if (idx < 0) return { ok: false, message: "Strategy not found." };
    store[idx] = { ...store[idx], ...patch, updatedAt: nowIso() };
    return { ok: true, strategy: store[idx] };
  }
  const updated = await prisma.strategy.update({
    where: { id: strategyId },
    data: patch,
  }).catch(() => null);
  if (!updated || updated.userId !== userId) return { ok: false, message: "Strategy not found." };
  return { ok: true, strategy: updated };
}

export async function logStrategyExecution({ strategyId, userId, isPaper, status, message, metadata }) {
  if (!hasDatabaseUrl()) {
    const record = {
      id: `exec_${crypto.randomBytes(8).toString("hex")}`,
      strategyId,
      userId,
      isPaper: Boolean(isPaper),
      status: String(status || "CREATED"),
      message: message ? String(message) : null,
      metadata: metadata ?? null,
      createdAt: nowIso(),
    };
    demoExecStore().unshift(record);
    return record;
  }

  return prisma.strategyExecution.create({
    data: {
      strategyId,
      userId,
      isPaper: Boolean(isPaper),
      status: String(status || "CREATED"),
      message: message ? String(message) : null,
      metadata: metadata ?? undefined,
    },
  });
}

export async function promoteStrategyToReal({ userId, strategyId }) {
  const strategy = await getStrategy({ userId, strategyId });
  if (!strategy) return { ok: false, message: "Strategy not found." };
  if (String(strategy.mode).toUpperCase() !== "PAPER") {
    return { ok: false, message: "Only paper strategies can be promoted." };
  }

  const clone = {
    name: `${strategy.name} (real)`,
    mode: "REAL",
    status: "DRAFT",
    type: strategy.type,
    config: strategy.config,
    promotedFromId: strategy.id,
  };

  if (!hasDatabaseUrl()) {
    const created = {
      id: `strat_${crypto.randomBytes(8).toString("hex")}`,
      userId,
      ...clone,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    demoStore().unshift(created);
    return { ok: true, strategy: created };
  }

  const created = await prisma.strategy.create({
    data: {
      userId,
      name: clone.name,
      mode: "REAL",
      status: "DRAFT",
      type: clone.type,
      config: clone.config,
      promotedFromId: clone.promotedFromId,
    },
  });

  return { ok: true, strategy: created };
}

export async function deleteStrategy({ userId, strategyId }) {
  if (!hasDatabaseUrl()) {
    const store = demoStore();
    const idx = store.findIndex((s) => s.id === strategyId && s.userId === userId);
    if (idx < 0) return { ok: false, message: "Strategy not found." };
    store.splice(idx, 1);
    return { ok: true, message: "Strategy deleted." };
  }

  const deleted = await prisma.strategy.deleteMany({ where: { id: strategyId, userId } });
  if (!deleted.count) return { ok: false, message: "Strategy not found." };
  return { ok: true, message: "Strategy deleted.", deletedCount: deleted.count };
}

