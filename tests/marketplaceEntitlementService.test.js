import test from "node:test";
import assert from "node:assert/strict";
import { entitlementWhereClause } from "../lib/server/marketplaceEntitlementService.js";

test("entitlementWhereClause includes ACTIVE and GRACE branches without key overwrite", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");
  const where = entitlementWhereClause({ userId: "user_1", profileId: "profile_1", now });

  assert.equal(where.userId, "user_1");
  assert.equal(where.profileId, "profile_1");
  assert.equal(where.OR.length, 2);
  assert.equal(where.OR[0].status, "ACTIVE");
  assert.deepEqual(where.OR[0].OR, [{ endsAt: null }, { endsAt: { gt: now } }]);
  assert.equal(where.OR[1].status, "GRACE");
  assert.deepEqual(where.OR[1].graceEndsAt, { gt: now });
});
