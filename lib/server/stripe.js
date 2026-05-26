import Stripe from "stripe";

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || "";
}

export function isStripeEnabled() {
  return Boolean(stripeSecretKey());
}

export function getStripeClient() {
  const key = stripeSecretKey();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is required to use Stripe features.");
  }
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

