import { NextResponse } from "next/server";
import { kycWebhookHandler } from "../../../../lib/server/complianceProviders.js";
import { adminUpdateVerification } from "../../../../lib/server/adminComplianceService.js";

export async function POST(request, { params }) {
  const provider = params.provider || "unknown";
  const payload = await request.json().catch(() => ({}));

  if (payload.type === "identity.verified" && payload.userId) {
    const result = await adminUpdateVerification({
      targetUserId: payload.userId,
      type: "IDENTITY",
      status: "VERIFIED",
      actorId: payload.userId,
      note: `Webhook from ${provider}`,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  const result = kycWebhookHandler(provider, payload);
  return NextResponse.json(result, { status: result.ok ? 200 : 501 });
}
