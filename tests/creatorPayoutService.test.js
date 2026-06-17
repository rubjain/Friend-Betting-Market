import test from "node:test";
import assert from "node:assert/strict";
import {
  listPayoutReconciliationQueue,
  updateCreatorPayoutStatus,
} from "../lib/server/creatorPayoutService.js";

test("listPayoutReconciliationQueue returns empty demo payload without database", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    const result = await listPayoutReconciliationQueue();
    assert.equal(result.ok, true);
    assert.deepEqual(result.payouts, []);
    assert.deepEqual(result.failedInvoices, []);
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

test("updateCreatorPayoutStatus rejects unsupported status", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    const result = await updateCreatorPayoutStatus({ payoutId: "p_1", status: "INVALID" });
    assert.equal(result.ok, false);
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});
