import {
  buildExportFilename,
  buildLedgerExportRows,
  ledgerExportColumns,
  toCsv,
} from "../../../../../lib/exporters.js";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import { buildDatabaseLedgerExportRows } from "../../../../../lib/server/exportService.js";
import { getDemoState } from "../../../../../lib/server/demoStore.js";
import { getLedgerView } from "../../../../../lib/ledgerViews.js";

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get("filter") || "all";
  const sort = searchParams.get("sort") || "newest";
  const state = getDemoState();
  const fallbackRows = getLedgerView({
    entries: state.ledger,
    filter,
    sort,
    page: 1,
    pageSize: 5000,
  }).entries;
  const rows =
    (await buildDatabaseLedgerExportRows({ filter, sort })) ?? buildLedgerExportRows(fallbackRows);
  const csv = toCsv(rows, ledgerExportColumns);
  const filename = buildExportFilename("friendmarket-ledger-export", { filter, sort });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
