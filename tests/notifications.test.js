import assert from "node:assert/strict";
import test from "node:test";
import { buildNotifications, countActionableNotifications } from "../lib/notifications.js";

test("notification center prioritizes urgent and actionable items", () => {
  const notifications = buildNotifications({
    auth: { expiresSoon: true },
    currentUser: {
      withdrawable_balance: 25,
      settings: {
        emailVerificationStatus: "pending",
        paymentVerificationStatus: "required",
      },
    },
    friends: {
      pending: [
        { direction: "incoming", username: "@maya" },
        { direction: "outgoing", username: "@theo" },
      ],
    },
    portfolio: { openBets: [{ id: "bet_1" }, { id: "bet_2" }] },
  });

  assert.equal(notifications[0].id, "session-expiring");
  assert.equal(notifications.some((item) => item.id === "incoming-friends"), true);
  assert.equal(notifications.some((item) => item.id === "open-positions"), true);
  assert.equal(countActionableNotifications(notifications), 4);
});

test("notification center includes admin review only for admins", () => {
  const base = {
    auth: {},
    currentUser: { isAdmin: false, settings: {} },
    friends: { pending: [] },
    portfolio: { openBets: [] },
    pendingMarkets: [{ id: "pending_1" }],
  };

  assert.equal(buildNotifications(base).some((item) => item.id === "admin-market-review"), false);
  assert.equal(
    buildNotifications({ ...base, currentUser: { isAdmin: true, settings: {} } }).some(
      (item) => item.id === "admin-market-review",
    ),
    true,
  );
});

test("notification center is empty when there is nothing to review", () => {
  const notifications = buildNotifications({
    auth: {},
    currentUser: {
      withdrawable_balance: 0,
      settings: {
        emailVerificationStatus: "verified",
        paymentVerificationStatus: "verified",
      },
    },
    friends: { pending: [] },
    portfolio: { openBets: [] },
    pendingMarkets: [],
  });

  assert.deepEqual(notifications, []);
  assert.equal(countActionableNotifications(notifications), 0);
});
