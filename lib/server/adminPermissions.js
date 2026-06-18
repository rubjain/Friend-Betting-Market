import { hasDatabaseUrl } from "./prisma.js";
import { agoraAdminLevelsJson } from "./env.js";

export const ADMIN_PERMISSIONS = {
  READ: "admin:read",
  CONFIG: "admin:config",
  FINANCE: "admin:finance",
  MARKET_MODERATION: "admin:market_moderation",
  MARKET_RESOLUTION: "admin:market_resolution",
  RISK: "admin:risk",
  OWNER: "admin:owner",
};

export const ADMIN_PERMISSION_LEVELS = {
  viewer: [ADMIN_PERMISSIONS.READ],
  market_manager: [
    ADMIN_PERMISSIONS.READ,
    ADMIN_PERMISSIONS.MARKET_MODERATION,
    ADMIN_PERMISSIONS.MARKET_RESOLUTION,
  ],
  risk_manager: [ADMIN_PERMISSIONS.READ, ADMIN_PERMISSIONS.RISK],
  finance_manager: [ADMIN_PERMISSIONS.READ, ADMIN_PERMISSIONS.FINANCE],
  owner: Object.values(ADMIN_PERMISSIONS),
};

function parseConfiguredLevels(env = process.env) {
  const raw = agoraAdminLevelsJson(env);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeLevel(level) {
  const normalized = String(level || "").trim().toLowerCase();
  return ADMIN_PERMISSION_LEVELS[normalized] ? normalized : "";
}

export function getAdminLevel(session, env = process.env) {
  if (!session?.isAdmin) return "";
  if (!hasDatabaseUrl()) return "owner";

  const configured = parseConfiguredLevels(env);
  return normalizeLevel(configured[session.userId]) || (session.userId === "admin_1" ? "owner" : "viewer");
}

export function getAdminPermissions(session, env = process.env) {
  const level = getAdminLevel(session, env);
  return new Set(ADMIN_PERMISSION_LEVELS[level] || []);
}

export function hasAdminPermission(session, permission, env = process.env) {
  const permissions = getAdminPermissions(session, env);
  return permissions.has(ADMIN_PERMISSIONS.OWNER) || permissions.has(permission);
}
