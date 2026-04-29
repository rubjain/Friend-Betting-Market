import assert from "node:assert/strict";
import test from "node:test";
import {
  getDemoState,
  approveDemoMarket,
  addDemoDeposit,
  clearDemoRiskReview,
  freezeDemoUser,
  grantDemoBonus,
  handleDemoFriendRequest,
  placeDemoBet,
  rejectDemoMarket,
  removeDemoUserBonus,
  resetDemoStore,
  resolveDemoMarket,
  sendDemoFriendInvite,
  submitDemoMarket,
  toggleDemoFriendBoost,
  updateDemoAdminConfig,
  updateDemoMarketLifecycle,
  updateDemoProfile,
  updateDemoVerification,
} from "../lib/server/demoStore.js";

test("server bet placement debits balances and creates ledger entries", () => {
  resetDemoStore();
  const before = getDemoState();
  const result = placeDemoBet({
    marketId: "market_1",
    side: "YES",
    betDraft: {
      stake: 10,
      withdrawableShare: 6,
      bonusShare: 4,
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.state.currentUser.withdrawable_balance, before.currentUser.withdrawable_balance - 6);
  assert.equal(result.state.currentUser.bonus_balance, before.currentUser.bonus_balance - 4);
  assert.equal(result.state.portfolio.openBets[0].side, "YES");
  assert.deepEqual(
    result.state.ledger.slice(0, 2).map((entry) => [entry.transaction_type, entry.amount, entry.currency_type]),
    [
      ["debit", 6, "withdrawable"],
      ["debit", 4, "bonus"],
    ],
  );
});

test("server market resolution credits winning mixed-funded bets", () => {
  resetDemoStore();
  placeDemoBet({
    marketId: "market_1",
    side: "YES",
    betDraft: {
      stake: 10,
      withdrawableShare: 6,
      bonusShare: 4,
    },
  });

  const result = resolveDemoMarket({ activeId: "active_1", result: "YES" });

  assert.equal(result.ok, true);
  assert.equal(result.state.activeMarkets.some((market) => market.id === "active_1"), false);
  assert.equal(result.state.resolvedMarkets[0].result, "YES");
  assert.equal(result.state.resolvedMarkets[0].resolverNotes.includes("demo admin workflow"), true);
  assert.equal(result.state.markets.find((market) => market.id === "market_1").status, "resolved");
  assert.equal(result.state.portfolio.pastBets[0].settlement.includes("Won."), true);
  assert.deepEqual(
    result.state.ledger.slice(0, 3).map((entry) => [entry.transaction_type, entry.currency_type, entry.source]),
    [
      ["credit", "withdrawable", "market_payout"],
      ["credit", "bonus", "market_payout"],
      ["credit", "bonus", "social_boost"],
    ],
  );
});

test("server market void refunds original open bet stakes", () => {
  resetDemoStore();
  placeDemoBet({
    marketId: "market_1",
    side: "YES",
    betDraft: {
      stake: 10,
      withdrawableShare: 6,
      bonusShare: 4,
    },
  });
  const beforeVoid = getDemoState();
  const result = resolveDemoMarket({ activeId: "active_1", result: "VOID" });

  assert.equal(result.ok, true);
  assert.equal(result.state.currentUser.withdrawable_balance, beforeVoid.currentUser.withdrawable_balance + 12);
  assert.equal(result.state.currentUser.bonus_balance, beforeVoid.currentUser.bonus_balance + 8);
  assert.equal(result.state.markets.find((market) => market.id === "market_1").status, "voided");
  assert.equal(result.state.resolvedMarkets[0].result, "VOID");
  assert.equal(result.state.portfolio.pastBets[0].settlement.includes("Voided"), true);
  assert.deepEqual(
    result.state.ledger.slice(0, 2).map((entry) => [entry.source, entry.amount, entry.currency_type]),
    [
      ["refund", 6, "withdrawable"],
      ["refund", 4, "bonus"],
    ],
  );
});

test("server market lifecycle can pause betting and resume", () => {
  resetDemoStore();
  const paused = updateDemoMarketLifecycle({ activeId: "active_1", status: "paused" });

  assert.equal(paused.ok, true);
  assert.equal(paused.state.activeMarkets.find((market) => market.id === "active_1").status, "Paused");
  assert.equal(paused.state.markets.find((market) => market.id === "market_1").status, "paused");

  const blockedBet = placeDemoBet({
    marketId: "market_1",
    side: "YES",
    betDraft: {
      stake: 10,
      withdrawableShare: 6,
      bonusShare: 4,
    },
  });

  assert.equal(blockedBet.ok, false);
  assert.match(blockedBet.message, /not accepting bets/);

  const resumed = updateDemoMarketLifecycle({ activeId: "active_1", status: "active" });
  const acceptedBet = placeDemoBet({
    marketId: "market_1",
    side: "YES",
    betDraft: {
      stake: 10,
      withdrawableShare: 6,
      bonusShare: 4,
    },
  });

  assert.equal(resumed.state.activeMarkets.find((market) => market.id === "active_1").status, "Active");
  assert.equal(acceptedBet.ok, true);
});

test("server market submission validates and queues admin review", () => {
  resetDemoStore();
  const invalid = submitDemoMarket({
    userId: "user_1",
    draft: {
      title: "Short",
      category: "Sports",
      closeDate: "2026-04-27",
      description: "Thin",
    },
  });

  assert.equal(invalid.ok, false);
  assert.equal(invalid.errors.title.includes("10 characters"), true);

  const valid = submitDemoMarket({
    userId: "user_1",
    draft: {
      title: "Will the Giants make the playoffs?",
      category: "Sports",
      closeDate: "2026-09-01",
      description: "Resolves yes if the Giants officially qualify for the postseason.",
      sourceUrl: "https://www.nfl.com/standings/",
    },
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.state.pendingMarkets[0].title, "Will the Giants make the playoffs?");
  assert.equal(valid.state.pendingMarkets[0].sourceUrl, "https://www.nfl.com/standings/");
  assert.equal(valid.state.createMarketDraft.title, "");
  assert.equal(valid.state.createMarketDraft.sourceUrl, "");
});

test("server admin approval and rejection mutate market queues", () => {
  resetDemoStore();
  const submitted = submitDemoMarket({
    userId: "user_1",
    draft: {
      title: "Will ETH outperform BTC in July?",
      category: "Crypto",
      closeDate: "2026-07-31",
      description: "Resolves yes if ETH has a higher July percentage return than BTC.",
      sourceUrl: "https://www.coinbase.com/price/ethereum",
    },
  });
  const pendingId = submitted.state.pendingMarkets[0].id;
  const approved = approveDemoMarket({ pendingId });

  assert.equal(approved.ok, true);
  assert.equal(approved.state.pendingMarkets.some((market) => market.id === pendingId), false);
  assert.equal(approved.state.activeMarkets[0].title, "Will ETH outperform BTC in July?");
  assert.equal(approved.state.markets[0].category, "Crypto");
  assert.equal(approved.state.markets[0].resolutionChecklist.includes("Reference exchange"), true);
  assert.equal(approved.state.markets[0].evidenceLinks[0].url, "https://www.coinbase.com/price/ethereum");
  assert.equal(approved.state.markets[0].status, "active");

  const rejected = rejectDemoMarket({ pendingId: "pending_1" });

  assert.equal(rejected.ok, true);
  assert.equal(rejected.state.pendingMarkets.some((market) => market.id === "pending_1"), false);
});

test("server friend invites normalize usernames and reject duplicates", () => {
  resetDemoStore();
  const sent = sendDemoFriendInvite({ username: "  New.Friend  " });

  assert.equal(sent.ok, true);
  assert.equal(sent.state.friends.pending[0].username, "@new.friend");
  assert.equal(sent.state.friendInviteDraft, "");

  const duplicate = sendDemoFriendInvite({ username: "@new.friend" });

  assert.equal(duplicate.ok, false);
  assert.match(duplicate.message, /already/);
});

test("server friend request actions accept incoming requests", () => {
  resetDemoStore();
  const accepted = handleDemoFriendRequest({ username: "@ava", action: "accept" });

  assert.equal(accepted.ok, true);
  assert.equal(accepted.state.friends.pending.some((request) => request.username === "@ava"), false);
  assert.equal(accepted.state.friends.list[0].username, "@ava");
});

test("server friend boosts update selected market and enforce max group size", () => {
  resetDemoStore();
  const removed = toggleDemoFriendBoost({ username: "@maya", marketId: "market_1" });

  assert.equal(removed.ok, true);
  assert.equal(removed.state.markets.find((market) => market.id === "market_1").friendGroup.includes("Maya"), false);

  const added = toggleDemoFriendBoost({ username: "@maya", marketId: "market_1" });

  assert.equal(added.ok, true);
  assert.equal(added.state.markets.find((market) => market.id === "market_1").friendGroup.includes("Maya"), true);
  assert.equal(
    added.state.users.find((user) => user.name === "Maya Patel").risk_signals.includes("High repeat boost activity"),
    true,
  );

  handleDemoFriendRequest({ username: "@ava", action: "accept" });
  toggleDemoFriendBoost({ username: "@maya", marketId: "market_2" });
  toggleDemoFriendBoost({ username: "@jordy", marketId: "market_2" });
  toggleDemoFriendBoost({ username: "@theo", marketId: "market_2" });
  const blocked = toggleDemoFriendBoost({ username: "@ava", marketId: "market_2" });

  assert.equal(blocked.ok, false);
  assert.match(blocked.message, /max boost group size/);
});

test("server admin funds actions update balances, liability, and ledger", () => {
  resetDemoStore();
  const deposited = addDemoDeposit();

  assert.equal(deposited.ok, true);
  assert.equal(deposited.state.currentUser.withdrawable_balance, 173);
  assert.equal(deposited.state.ledger[0].source, "deposit");

  const bonused = grantDemoBonus();

  assert.equal(bonused.ok, true);
  assert.equal(bonused.state.currentUser.bonus_balance, 49);
  assert.equal(bonused.state.adminConfig.bonusLiability, 4830);
  assert.equal(bonused.state.ledger[0].source, "admin_adjustment");
});

test("server admin config normalizes numeric settings", () => {
  resetDemoStore();
  const updated = updateDemoAdminConfig({ field: "maxGroupSize", value: "3" });

  assert.equal(updated.ok, true);
  assert.equal(updated.state.adminConfig.maxGroupSize, 3);
});

test("server risk actions freeze, clear, and remove bonus balances", () => {
  resetDemoStore();
  const frozen = freezeDemoUser({ userId: "user_4" });

  assert.equal(frozen.ok, true);
  assert.equal(frozen.state.users.find((user) => user.id === "user_4").frozen, true);
  assert.equal(frozen.state.ledger[0].metadata, "Account frozen for manual review");

  const cleared = clearDemoRiskReview({ userId: "user_4" });

  assert.equal(cleared.ok, true);
  assert.equal(cleared.state.users.find((user) => user.id === "user_4").risk_status, "clear");

  const removed = removeDemoUserBonus({ userId: "user_4" });

  assert.equal(removed.ok, true);
  assert.equal(removed.state.users.find((user) => user.id === "user_4").bonus_balance, 48);
  assert.equal(removed.state.ledger[0].transaction_type, "debit");
});

test("server profile updates validate editable account fields", () => {
  resetDemoStore();
  const invalid = updateDemoProfile({ name: "A", email: "bad" });

  assert.equal(invalid.ok, false);

  const updated = updateDemoProfile({ name: "Arush Jain", email: "ARUSH.JAIN@example.com" });

  assert.equal(updated.ok, true);
  assert.equal(updated.state.currentUser.name, "Arush Jain");
  assert.equal(updated.state.currentUser.email, "arush.jain@example.com");
  assert.equal(updated.state.users.find((user) => user.id === "user_1").name, "Arush Jain");
});

test("server verification actions update demo verification statuses", () => {
  resetDemoStore();
  const email = updateDemoVerification({ type: "email" });
  const phone = updateDemoVerification({ type: "phone" });
  const identity = updateDemoVerification({ type: "identity" });

  assert.equal(email.state.currentUser.settings.emailVerificationStatus, "verified");
  assert.equal(phone.state.currentUser.settings.phoneVerificationStatus, "verified");
  assert.equal(identity.state.currentUser.settings.identityVerificationStatus, "placeholder");
});
