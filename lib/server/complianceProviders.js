/**
 * Compliance provider adapters for real-money launch.
 * Wire vendor SDKs/webhooks here; beta flows use self-service verificationService.
 */

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
