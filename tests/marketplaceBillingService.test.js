import test from "node:test";
import assert from "node:assert/strict";

import { createInvoice, upsertBillingSubscription } from "../lib/server/marketplaceBillingService.js";

test("upsertBillingSubscription returns normalized subscription shape in demo mode", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    const result = await upsertBillingSubscription({
      userId: "user_1",
      profileId: "profile_1",
      planId: "plan_1",
      status: "ACTIVE",
    });
    assert.equal(result.ok, true);
    assert.equal(result.subscription.userId, "user_1");
    assert.equal(result.subscription.profileId, "profile_1");
    assert.equal(result.subscription.status, "ACTIVE");
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

test("createInvoice returns normalized demo shape when database is unavailable", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    const result = await createInvoice({
      userId: "user_1",
      profileId: "profile_1",
      billingSubscriptionId: "sub_1",
      providerInvoiceId: "inv_1",
      amountDueCents: 2500,
      amountPaidCents: 2500,
      status: "PAID",
    });
    assert.equal(result.ok, true);
    assert.equal(result.invoice.id, "demo-invoice");
    assert.equal(result.invoice.status, "PAID");
  } finally {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  }
});
