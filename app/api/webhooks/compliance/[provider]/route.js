import { NextResponse } from "next/server";
import {
  handleComplianceWebhook,
  verifyComplianceWebhook,
} from "../../../../../lib/server/complianceProviders.js";
import { adminUpdateVerification } from "../../../../../lib/server/adminComplianceService.js";

export async function POST(request, { params }) {
  const { provider: rawProvider } = await params;
  const provider = rawProvider || "unknown";

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

  const decision = handleComplianceWebhook(provider, payload);
  if (!decision.ok) {
    return NextResponse.json(decision, { status: 501 });
  }

  const results = [];
  for (const update of decision.updates || []) {
    const result = await adminUpdateVerification({
      targetUserId: update.userId,
      type: update.type,
      status: update.status,
      actorId: null,
      note: update.note || `Updated via signed ${provider} webhook`,
    });
    results.push({
      ok: result.ok,
      userId: update.userId,
      type: update.type,
      status: update.status,
      message: result.message,
    });
  }
  const failed = results.find((entry) => !entry.ok);
  return NextResponse.json({ ok: !failed, provider, results }, { status: failed ? 400 : 200 });
}
