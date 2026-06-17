/**
 * Agora environment variables. Legacy FRIENDMARKET_* names are supported as fallbacks.
 */

function readEnv(env, name, legacyName) {
  return env[name] ?? (legacyName ? env[legacyName] : undefined);
}

export function agoraSessionSecret(env = process.env) {
  return readEnv(env, "AGORA_SESSION_SECRET", "AGORA_SESSION_SECRET") || "agora-local-demo-secret";
}

export function agoraDevAdminShortcutEnabled(env = process.env) {
  return readEnv(env, "AGORA_DEV_ADMIN_SHORTCUT", "AGORA_DEV_ADMIN_SHORTCUT") === "1";
}

export function agoraAppUrl(env = process.env) {
  return (
    readEnv(env, "AGORA_APP_URL", "AGORA_APP_URL") ||
    env.APP_URL ||
    "http://127.0.0.1:3000"
  );
}

export function agoraEmailFrom(env = process.env) {
  return readEnv(env, "AGORA_EMAIL_FROM", "AGORA_EMAIL_FROM") || "Agora <no-reply@example.com>";
}

export function agoraRealMoneyModeEnabled(env = process.env) {
  return readEnv(env, "AGORA_REAL_MONEY_MODE", "AGORA_REAL_MONEY_MODE") === "1";
}

export function agoraAdminLevelsJson(env = process.env) {
  return readEnv(env, "AGORA_ADMIN_LEVELS_JSON", "AGORA_ADMIN_LEVELS_JSON");
}

export function agoraDisableEspn(env = process.env) {
  return readEnv(env, "AGORA_DISABLE_ESPN", "AGORA_DISABLE_ESPN") === "1";
}

export function agoraForceDemoMode(env = process.env) {
  return readEnv(env, "AGORA_FORCE_DEMO_MODE", "AGORA_FORCE_DEMO_MODE") === "1";
}

export function agoraPublicBetaEnabled(env = process.env) {
  return readEnv(env, "AGORA_PUBLIC_BETA", "AGORA_PUBLIC_BETA") === "1";
}

export function agoraEspnSyncInline(env = process.env) {
  return readEnv(env, "AGORA_ESPN_SYNC_INLINE", "AGORA_ESPN_SYNC_INLINE") === "1";
}

export function agoraStrategyMarketplaceEnabled(env = process.env) {
  return readEnv(env, "AGORA_STRATEGY_MARKETPLACE_ENABLED", "AGORA_STRATEGY_MARKETPLACE_ENABLED") !== "0";
}

export function agoraStrategyMaxAllocationPct(env = process.env) {
  const value = Number(readEnv(env, "AGORA_STRATEGY_MAX_ALLOCATION_PCT", "AGORA_STRATEGY_MAX_ALLOCATION_PCT"));
  return Number.isFinite(value) && value > 0 ? value : 50;
}

export function agoraStrategyCopyMinStake(env = process.env) {
  const value = Number(readEnv(env, "AGORA_STRATEGY_COPY_MIN_STAKE", "AGORA_STRATEGY_COPY_MIN_STAKE"));
  return Number.isFinite(value) && value > 0 ? value : 0.5;
}
