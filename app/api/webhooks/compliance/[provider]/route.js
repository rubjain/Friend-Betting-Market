import { NextResponse } from "next/server";
import {
  kycWebhookHandler,
  verifyComplianceWebhook,
} from "../../../../../lib/server/complianceProviders.js";
import { adminUpdateVerification } from "../../../../../lib/server/adminComplianceService.js";

export async function POST(request, { params }) {
  const provider = params.provider || "unknown";

  // Read the raw body and verify the vendor signature BEFORE trusting any field.
  // Without this, anyone could POST { type: "identity.verified", userId } and
  // forge KYC approval for any account.
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-compliance-signature") ||
    request.headers.get("x-webhook-signature") ||
    request.headers.get("x-signature") ||
    "";

  const verification = verifyComplianceWebhook({ provider, rawBody, signature });
  if (!verification.ok) {
    const status = verification.reason === "secret_not_configured" ? 503 : 401;
    return NextResponse.json(
      { ok: false, message: "Compliance webhook signature verification failed." },
      { status },
    );
  }

  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 });
  }

  if (payload.type === "identity.verified" && payload.userId) {
    const result = await adminUpdateVerification({
      targetUserId: payload.userId,
      type: "IDENTITY",
      status: "VERIFIED",
      // System-initiated: actorId is a User FK, so leave it null rather than
      // self-attributing to the verified user. Provenance lives in the note.
      actorId: null,
      note: `Verified via signed ${provider} webhook`,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const result = kycWebhookHandler(provider, payload);
  return NextResponse.json(result, { status: result.ok ? 200 : 501 });
}
