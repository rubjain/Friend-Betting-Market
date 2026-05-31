import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../../lib/server/adminPermissions.js";
import { addDatabaseDeposit } from "../../../../../lib/server/fundsService.js";
import { addDemoDeposit } from "../../../../../lib/server/demoStore.js";

export async function POST(request) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.FINANCE);
  if (response) return response;

  const result = (await addDatabaseDeposit({ userId: session.userId })) ?? addDemoDeposit();
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
