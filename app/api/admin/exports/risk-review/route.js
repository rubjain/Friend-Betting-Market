import {
  buildExportFilename,
  buildRiskReviewExportRows,
  riskReviewExportColumns,
  toCsv,
} from "../../../../../lib/exporters.js";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import { buildDatabaseRiskReviewExportRows } from "../../../../../lib/server/exportService.js";
import { getDemoState } from "../../../../../lib/server/demoStore.js";

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const state = getDemoState();
  const riskUsers = state.users.filter((user) => user.risk_status !== "clear" || user.risk_score >= 40);
  const rows = (await buildDatabaseRiskReviewExportRows()) ?? buildRiskReviewExportRows(riskUsers);
  const csv = toCsv(rows, riskReviewExportColumns);
  const filename = buildExportFilename("friendmarket-risk-review-export");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
