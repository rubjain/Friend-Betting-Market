import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/server/auth.js";
import { getAdminLedgerPage } from "../../../../lib/server/adminDataService.js";

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const result = await getAdminLedgerPage({
    filter: searchParams.get("filter") || "all",
    sort: searchParams.get("sort") || "newest",
    page: searchParams.get("page") || 1,
    pageSize: searchParams.get("pageSize") || 8,
  });

  return NextResponse.json(result);
}
