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
  void provider;
  void payload;
  return {
    ok: false,
    message: "KYC webhook handler not configured. Set AGORA_KYC_PROVIDER and implement vendor mapping.",
  };
}

export function geoWebhookHandler(provider, payload) {
  void provider;
  void payload;
  return {
    ok: false,
    message: "Geolocation webhook handler not configured. Set AGORA_GEO_PROVIDER and implement vendor mapping.",
  };
}

export function stripeReconciliationNotes() {
  return [
    "Enable STRIPE_WEBHOOK_SECRET and reconcile charge.dispute.created events.",
    "Review payout failures in admin payment queue before marking withdrawals complete.",
    "Do not enable AGORA_REAL_MONEY_MODE until counsel approves jurisdiction and tax reporting.",
  ];
}
