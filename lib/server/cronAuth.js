import crypto from "node:crypto";

/**
 * Constant-time comparison of two strings. Returns false on any length
 * mismatch instead of throwing, so it is safe to call on attacker input.
 */
function safeEqual(a, b) {
  const bufferA = Buffer.from(String(a), "utf8");
  const bufferB = Buffer.from(String(b), "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * Authorize a cron/worker request. Fail-closed: if no secret is configured
 * the request is rejected in EVERY environment (no NODE_ENV exception), so a
 * missing CRON_SECRET can never leave these endpoints world-callable.
 *
 * Accepts the secret via `Authorization: Bearer <secret>` (used by manual
 * calls and most schedulers) or Vercel Cron's `x-vercel-cron` requests that
 * carry the same bearer token.
 */
export function isAuthorizedCronRequest(request) {
  const secret = process.env.CRON_SECRET || process.env.AGORA_CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") || "";
  return safeEqual(header, `Bearer ${secret}`);
}
