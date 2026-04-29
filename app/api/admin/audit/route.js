import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/server/auth.js";
import { getAdminAuditPage } from "../../../../lib/server/adminDataService.js";

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const result = await getAdminAuditPage({
    action: searchParams.get("action") || "all",
    page: searchParams.get("page") || 1,
    pageSize: searchParams.get("pageSize") || 20,
  });

  return NextResponse.json(result);
}
