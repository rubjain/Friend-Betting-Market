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
