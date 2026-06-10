import { NextResponse } from "next/server";
import { requireAuthenticated } from "../../../../../lib/server/auth.js";
import { submitIdentityVerification } from "../../../../../lib/server/verificationService.js";

export async function POST(request) {
  const { session, response } = await requireAuthenticated(request);
  if (response) return response;

  const payload = await request.json();
  const result = await submitIdentityVerification({
    userId: session.userId,
    legalFirstName: payload.legalFirstName,
    legalLastName: payload.legalLastName,
    dateOfBirth: payload.dateOfBirth,
    addressLine1: payload.addressLine1,
    city: payload.city,
    state: payload.state,
    zip: payload.zip,
    attestationAccepted: Boolean(payload.attestationAccepted),
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
