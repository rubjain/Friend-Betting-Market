import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS } from "../../../../../../lib/server/adminPermissions.js";
import { requireAdminPermission } from "../../../../../../lib/server/auth.js";
import { reviewDatabasePaymentTransaction } from "../../../../../../lib/server/fundsService.js";

export async function POST(request, { params }) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.FINANCE);
  if (response) return response;

  const payload = await request.json();
  const result =
    (await reviewDatabasePaymentTransaction({
      transactionId: params.transactionId,
      decision: payload.decision,
      notes: payload.notes,
      reviewerId: session.userId,
    })) ?? { ok: false, message: "Persistent payment review requires DATABASE_URL." };

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
