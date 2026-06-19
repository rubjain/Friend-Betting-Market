import { NextResponse } from "next/server";
import { ADMIN_PERMISSIONS } from "../../../../lib/server/adminPermissions.js";
import { requireAdminPermission } from "../../../../lib/server/auth.js";
import { getDatabasePaymentReviewQueue } from "../../../../lib/server/fundsService.js";

export async function GET(request) {
  const { response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.FINANCE);
  if (response) return response;

  const queue = (await getDatabasePaymentReviewQueue()) ?? { ok: true, transactions: [] };
  return NextResponse.json(queue);
}
