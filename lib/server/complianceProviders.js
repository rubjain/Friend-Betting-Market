/**
 * Compliance provider adapters for real-money launch.
 * Wire vendor SDKs/webhooks here; beta flows use self-service verificationService.
 */

import crypto from "node:crypto";

export const COMPLIANCE_PROVIDERS = {
  kyc: process.env.AGORA_KYC_PROVIDER || "self-service-beta",
  geolocation: process.env.AGORA_GEO_PROVIDER || "browser-geolocation",
  sanctions: process.env.AGORA_SANCTIONS_PROVIDER || "demo-screen",
  payments: process.env.STRIPE_SECRET_KEY ? "stripe" : "demo",
};

export function isProductionComplianceReady(env = process.env) {
  return Boolean(
    env.AGORA_REAL_MONEY_MODE === "1" &&
      env.AGORA_KYC_PROVIDER &&
      env.AGORA_KYC_PROVIDER !== "self-service-beta" &&
      env.AGORA_GEO_PROVIDER &&
      env.AGORA_GEO_PROVIDER !== "browser-geolocation" &&
      env.AGORA_SANCTIONS_PROVIDER &&
      env.AGORA_SANCTIONS_PROVIDER !== "demo-screen",
  );
}

/**
 * Resolve the shared secret for a compliance webhook. A per-provider override
 * (AGORA_COMPLIANCE_WEBHOOK_SECRET_<PROVIDER>) takes precedence over the global
 * AGORA_COMPLIANCE_WEBHOOK_SECRET so multiple vendors can rotate independently.
 */
export function complianceWebhookSecret(provider, env = process.env) {
  const normalized = String(provider || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_");
  return (
    env[`AGORA_COMPLIANCE_WEBHOOK_SECRET_${normalized}`] ||
    env.AGORA_COMPLIANCE_WEBHOOK_SECRET ||
    ""
  );
}

function safeEqualHex(a, b) {
  const bufferA = Buffer.from(String(a), "utf8");
  const bufferB = Buffer.from(String(b), "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Verify a compliance webhook's HMAC-SHA256 signature over the raw request
 * body. Fail-closed: an unconfigured secret or missing/invalid signature is
 * rejected, so no caller can forge identity/location verification.
 *
 * Returns { ok, reason }. The signature header may optionally be prefixed with
 * "sha256=" (common vendor convention).
 */
export function verifyComplianceWebhook({ provider, rawBody, signature }, env = process.env) {
  const secret = complianceWebhookSecret(provider, env);
  if (!secret) {
    return { ok: false, reason: "secret_not_configured" };
  }
  if (!signature) {
    return { ok: false, reason: "missing_signature" };
  }

  const provided = String(signature).replace(/^sha256=/i, "").trim().toLowerCase();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody ?? "", "utf8")
    .digest("hex");

  return safeEqualHex(provided, expected)
    ? { ok: true }
    : { ok: false, reason: "invalid_signature" };
}

export function kycWebhookHandler(provider, payload) {
  return parseComplianceDecision(provider, payload, "IDENTITY");
}

export function geoWebhookHandler(provider, payload) {
  return parseComplianceDecision(provider, payload, "LOCATION");
}

export function sanctionsWebhookHandler(provider, payload) {
  return parseComplianceDecision(provider, payload, "SANCTIONS");
}

function mapDecisionToStatus(rawDecision) {
  const decision = String(rawDecision || "").toLowerCase();
  if (["approved", "pass", "passed", "verified", "allow", "clear"].includes(decision)) return "VERIFIED";
  if (["denied", "fail", "failed", "blocked", "reject", "rejected"].includes(decision)) return "FAILED";
  if (["review", "pending", "manual_review", "manual-review"].includes(decision)) return "REQUIRED";
  return "PENDING";
}

function extractUserId(payload) {
  return (
    payload?.userId ||
    payload?.metadata?.userId ||
    payload?.customer?.metadata?.userId ||
    payload?.subject?.userId ||
    null
  );
}

function extractDecision(payload) {
  return (
    payload?.decision ||
    payload?.result ||
    payload?.status ||
    payload?.outcome ||
    payload?.review?.decision ||
    null
  );
}

function parseComplianceDecision(provider, payload, type) {
  const userId = extractUserId(payload);
  if (!userId) {
    return { ok: false, message: "Compliance payload missing userId.", updates: [] };
  }
  const decision = extractDecision(payload);
  const status = mapDecisionToStatus(decision);
  return {
    ok: true,
    updates: [
      {
        userId,
        type,
        status,
        note: `${type} check ${status.toLowerCase()} via ${provider} webhook`,
        provider,
        metadata: {
          decision: decision || null,
          referenceId: payload?.referenceId || payload?.id || null,
        },
      },
    ],
  };
}

export function handleComplianceWebhook(provider, payload = {}) {
  const eventType = String(payload?.type || payload?.event || "").toLowerCase();
  if (eventType.includes("identity") || eventType.includes("kyc")) {
    return kycWebhookHandler(provider, payload);
  }
  if (eventType.includes("location") || eventType.includes("geo")) {
    return geoWebhookHandler(provider, payload);
  }
  if (eventType.includes("sanction") || eventType.includes("watchlist")) {
    return sanctionsWebhookHandler(provider, payload);
  }
  return {
    ok: false,
    message: "Unsupported compliance webhook type.",
    updates: [],
  };
}

export function stripeReconciliationNotes() {
  return [
    "Enable STRIPE_WEBHOOK_SECRET and reconcile charge.dispute.created events.",
    "Review payout failures in admin payment queue before marking withdrawals complete.",
    "Do not enable AGORA_REAL_MONEY_MODE until counsel approves jurisdiction and tax reporting.",
  ];
}
