import { hasDatabaseUrl } from "./prisma.js";
import {
  agoraAppUrl,
  agoraDevAdminShortcutEnabled,
  agoraDisableEspn,
  agoraEmailFrom,
  agoraRealMoneyModeEnabled,
  agoraSessionSecret,
} from "./env.js";

const LOCAL_SESSION_SECRET = "agora-local-demo-secret";

export function isPublicBetaRuntime(env = process.env) {
  return env.AGORA_PUBLIC_BETA === "1" || env.NODE_ENV === "production";
}

export function realMoneyDisabledPayload() {
  return {
    ok: false,
    code: "REAL_MONEY_DISABLED",
    message: "Real-money trading is disabled for the paper-money beta.",
  };
}

export function shouldBlockRealMoney(env = process.env) {
  return !agoraRealMoneyModeEnabled(env);
}

function hasConfiguredEmail(env = process.env) {
  return Boolean(env.EMAIL_USER && env.EMAIL_PASS);
}

function sessionSecretIsSafe(env = process.env) {
  const value = agoraSessionSecret(env);
  return Boolean(value && value !== LOCAL_SESSION_SECRET && value.length >= 32);
}

export function getBetaLaunchChecks(env = process.env) {
  const publicBeta = isPublicBetaRuntime(env);
  const checks = [
    {
      key: "database",
      ok: Boolean(env.DATABASE_URL),
      required: publicBeta,
      message: "DATABASE_URL must point to Supabase/Postgres for public beta.",
    },
    {
      key: "directDatabase",
      ok: Boolean(env.DIRECT_URL),
      required: publicBeta,
      message: "DIRECT_URL should be configured for Prisma migrations.",
    },
    {
      key: "sessionSecret",
      ok: sessionSecretIsSafe(env),
      required: publicBeta,
      message: "AGORA_SESSION_SECRET must be a long non-default secret.",
    },
    {
      key: "appUrl",
      ok: /^https?:\/\//.test(agoraAppUrl(env)),
      required: publicBeta,
      message: "AGORA_APP_URL must be the deployed app origin.",
    },
    {
      key: "emailDelivery",
      ok: hasConfiguredEmail(env),
      required: publicBeta,
      message: "EMAIL_USER and EMAIL_PASS are required for user-facing verification emails.",
    },
    {
      key: "realMoneyDisabled",
      ok: !agoraRealMoneyModeEnabled(env),
      required: publicBeta,
      message: "AGORA_REAL_MONEY_MODE must stay 0 until legal/compliance approval.",
    },
    {
      key: "devAdminDisabled",
      ok: !agoraDevAdminShortcutEnabled(env),
      required: publicBeta,
      message: "AGORA_DEV_ADMIN_SHORTCUT must be disabled outside local development.",
    },
  ];

  return {
    publicBeta,
    mode: publicBeta ? "public-beta" : "local-development",
    provider: {
      liveScores: agoraDisableEspn(env) ? "demo" : "espn",
      emailFrom: agoraEmailFrom(env),
    },
    checks,
    ready: checks.every((check) => !check.required || check.ok),
  };
}

export function persistentRuntimeAvailable() {
  return hasDatabaseUrl();
}

export function betaRuntimeError(env = process.env) {
  if (!isPublicBetaRuntime(env) || persistentRuntimeAvailable()) {
    return null;
  }

  return {
    ok: false,
    code: "DATABASE_REQUIRED",
    message: "Public beta requires DATABASE_URL. Demo fallback is local-development only.",
  };
}
