import { NextResponse } from "next/server";
import { requireAdminPermission } from "../../../../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../../../../lib/server/adminPermissions.js";
import { updateDatabaseAdminConfig } from "../../../../lib/server/adminConfigService.js";
import { updateDemoAdminConfig } from "../../../../lib/server/demoStore.js";

export async function PATCH(request) {
  const { session, response } = await requireAdminPermission(request, ADMIN_PERMISSIONS.CONFIG);
  if (response) return response;

  const payload = await request.json();
  const databaseResult = await updateDatabaseAdminConfig({
    field: payload.field,
    value: payload.value,
    userId: session.userId,
  });
  const result =
    databaseResult ??
    updateDemoAdminConfig({
      field: payload.field,
      value: payload.value,
    });

  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
