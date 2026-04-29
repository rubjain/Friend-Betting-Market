import {
  buildLedgerExportRows,
  ledgerExportColumns,
  toCsv,
} from "../../../../../lib/exporters.js";
import { requireAdmin } from "../../../../../lib/server/auth.js";
import { buildDatabaseLedgerExportRows } from "../../../../../lib/server/exportService.js";
import { getDemoState } from "../../../../../lib/server/demoStore.js";

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const state = getDemoState();
  const rows = (await buildDatabaseLedgerExportRows()) ?? buildLedgerExportRows(state.ledger);
  const csv = toCsv(rows, ledgerExportColumns);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": 'attachment; filename="friendmarket-ledger-export.csv"',
    },
  });
}
