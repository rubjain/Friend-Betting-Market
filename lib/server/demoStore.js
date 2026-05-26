import {
  createAdminAdjustmentEntry,
  createBetLedgerEntries,
  createFundsCreditEntry,
  createLedgerEntry,
  createRefundLedgerEntries,
  createSettlementLedgerEntries,
} from "../accounting.js";
import { defaultState } from "../defaultState.js";
import { calculatePayout } from "../marketMath.js";
import { getResolutionTemplate, sportMarketCategories } from "../marketTaxonomy.js";
import { applyRiskSignalsToUser, getBoostRiskSignals } from "../riskEngine.js";
import { hasValidationErrors, validateCreateMarketDraft } from "../validation.js";

const sportCategoryLabels = new Set(sportMarketCategories.map((category) => category.label));

function cloneState(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function getSelectedMarketFromState(state, marketId = state.selectedMarketId) {
  return state.markets.find((market) => market.id === marketId) ?? state.markets[0];
}

function sanitizeSportsState(state) {
  state.markets = state.markets.filter((market) => sportCategoryLabels.has(market.category));
  const existingMarketIds = new Set(state.markets.map((market) => market.id));
  for (const market of defaultState.markets) {
    if (!existingMarketIds.has(market.id)) {
      state.markets.push(cloneState(market));
    }
  }
  const marketById = new Map(state.markets.map((market) => [market.id, market]));

  state.pendingMarkets = state.pendingMarkets.filter((market) => sportCategoryLabels.has(market.category));
  state.activeMarkets = state.activeMarkets.filter(
    (market) => !market.marketId || marketById.has(market.marketId),
  ).map((market) => {
    const sourceMarket = marketById.get(market.marketId);
    return sourceMarket ? { ...market, title: sourceMarket.title, volume: sourceMarket.volume } : market;
  });
  state.portfolio.openBets = state.portfolio.openBets.filter(
    (bet) => !bet.marketId || marketById.has(bet.marketId),
  ).map((bet) => {
    const sourceMarket = marketById.get(bet.marketId);
    return sourceMarket ? { ...bet, market: sourceMarket.title } : bet;
  });

  if (!marketById.has(state.selectedMarketId)) {
    state.selectedMarketId = defaultState.selectedMarketId;
  }

  return state;
}

function getFriendBoostName(friend) {
  return friend.name.split(" ")[0];
}

function normalizeUsername(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");

  return cleaned ? `@${cleaned}` : "";
}

function nameFromUsername(username) {
  return username
    .slice(1)
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function addLedgerEntries(state, entries) {
  state.ledger.unshift(...entries.map((entry) => createLedgerEntry(entry)));
}

function userPublicProfile(user) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    withdrawable_balance: user.withdrawable_balance ?? 0,
    bonus_balance: user.bonus_balance ?? 0,
    play_credit_balance: (user.withdrawable_balance ?? 0) + (user.bonus_balance ?? 0),
    paper_balance: user.paper_balance ?? 10000,
    settings: {
      ...defaultState.currentUser.settings,
      riskStatus: user.risk_status ?? "clear",
    },
  };
}

function applySessionUser(state, userId = state.currentUser.id) {
  const user = state.users.find((item) => item.id === userId) ?? state.users[0];
  if (!user) {
    return state;
  }

  const currentSessionUser = state.currentUser.id === user.id ? state.currentUser : {};
  const profile = userPublicProfile(user);
  state.currentUser = {
    ...state.currentUser,
    ...profile,
    name: currentSessionUser.name ?? profile.name,
    username: currentSessionUser.username ?? profile.username,
    email: currentSessionUser.email ?? profile.email,
    settings: {
      ...profile.settings,
      ...(currentSessionUser.settings || {}),
    },
    isAdmin: Boolean(state.currentUser.isAdmin),
  };
  refreshDerivedBalances(state);
  return state;
}

function friendRecordForUser(record, userId, state) {
  if (!record.requesterId || !record.addresseeId) {
    return record;
  }
  if (record.requesterId !== userId && record.addresseeId !== userId) {
    return null;
  }

  const otherId = record.requesterId === userId ? record.addresseeId : record.requesterId;
  const other = state.users.find((user) => user.id === otherId);
  if (!other) {
    return null;
  }

  return {
    ...record,
    name: other.name,
    username: other.username,
    status: other.risk_status === "review" || other.risk_status === "frozen" ? "Monitor" : "Trusted",
  };
}

function pendingRecordForUser(record, userId, state) {
  if (!record.requesterId || !record.addresseeId) {
    return record;
  }
  if (record.requesterId !== userId && record.addresseeId !== userId) {
    return null;
  }

  const outgoing = record.requesterId === userId;
  const otherId = outgoing ? record.addresseeId : record.requesterId;
  const other = state.users.find((user) => user.id === otherId);
  if (!other) {
    return null;
  }

  return {
    ...record,
    name: other.name,
    username: other.username,
    direction: outgoing ? "outgoing" : "incoming",
  };
}

function personalizeStateForUser(state, userId = state.currentUser.id) {
  applySessionUser(state, userId);
  state.friends = {
    ...state.friends,
    list: state.friends.list
      .map((record) => friendRecordForUser(record, userId, state))
      .filter(Boolean),
    pending: state.friends.pending
      .map((record) => pendingRecordForUser(record, userId, state))
      .filter(Boolean),
  };
  return state;
}

function refreshDerivedBalances(state) {
  state.currentUser.play_credit_balance =
    state.currentUser.withdrawable_balance + state.currentUser.bonus_balance;

  const userIndex = state.users.findIndex((user) => user.id === state.currentUser.id);
  if (userIndex >= 0) {
    state.users[userIndex] = {
      ...state.users[userIndex],
      withdrawable_balance: state.currentUser.withdrawable_balance,
      bonus_balance: state.currentUser.bonus_balance,
      paper_balance: state.currentUser.paper_balance,
      risk_status: state.currentUser.settings.riskStatus,
    };
  }
}

const numericAdminFields = new Set([
  "maxGroupSize",
  "multiplierPerFriend",
  "maxMultiplier",
  "maxBonusPayoutPerUser",
  "maxBonusPayoutPerMarket",
  "dailyBonusPayoutLimit",
  "maxBonusStakePercent",
  "bonusLiability",
]);

function addLedgerEntry(state, entry) {
  state.ledger.unshift(createLedgerEntry(entry));
}

function seedLedger(state) {
  if (state.currentUser.id === "user_1" && state.currentUser.withdrawable_balance === 100) {
    return;
  }

  if (state.ledger.length) {
    return;
  }

  const market = state.markets.find((item) => item.id === "market_1") ?? getSelectedMarketFromState(state);
  const example = calculatePayout({
    stake: 10,
    withdrawableShare: 6,
    bonusShare: 4,
    market,
    adminConfig: state.adminConfig,
  });

  state.ledger = [
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "debit",
      amount: 6,
      currency_type: "withdrawable",
      source: "bet_placed",
      timestamp: "2026-04-26T09:10:00Z",
      metadata: "Stake reserved from withdrawable balance",
    },
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "debit",
      amount: 4,
      currency_type: "bonus",
      source: "bet_placed",
      timestamp: "2026-04-26T09:10:00Z",
      metadata: "Stake reserved from bonus balance",
    },
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "credit",
      amount: example.totalWithdrawableReturn,
      currency_type: "withdrawable",
      source: "market_payout",
      timestamp: "2026-04-26T12:10:00Z",
      metadata: "Normal payout routed by withdrawable funding ratio",
    },
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "credit",
      amount: example.bonusPayoutFromNormal,
      currency_type: "bonus",
      source: "market_payout",
      timestamp: "2026-04-26T12:10:00Z",
      metadata: "Normal payout routed by bonus funding ratio",
    },
    {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: "bet_1001",
      transaction_type: "credit",
      amount: example.socialBonus,
      currency_type: "bonus",
      source: "social_boost",
      timestamp: "2026-04-26T12:10:00Z",
      metadata: `Boosted payout at ${example.multiplier.toFixed(2)}x; non-withdrawable bonus credit`,
    },
  ];
}

function addFunds(state, { amount, currencyType, source, metadata }) {
  if (currencyType === "withdrawable") {
    state.currentUser.withdrawable_balance += amount;
  } else {
    state.currentUser.bonus_balance += amount;
  }
  addLedgerEntry(state, createFundsCreditEntry({
    userId: state.currentUser.id,
    amount,
    currencyType,
    source,
    metadata,
  }));
  refreshDerivedBalances(state);
}

export function createDemoState() {
  const state = cloneState(defaultState);
  seedLedger(state);
  applySessionUser(state, state.currentUser.id);
  return state;
}

function getStore() {
  if (!globalThis.__friendMarketDemoStore) {
    globalThis.__friendMarketDemoStore = createDemoState();
  }
  sanitizeSportsState(globalThis.__friendMarketDemoStore);
  return globalThis.__friendMarketDemoStore;
}

export function getDemoState(userId) {
  return personalizeStateForUser(cloneState(getStore()), userId);
}

export function resetDemoStore() {
  globalThis.__friendMarketDemoStore = createDemoState();
  return getDemoState();
}

export function resetPaperBalanceForDemoUser(userId = defaultState.currentUser.id, startingBalance = 10000) {
  const state = getStore();
  // Ensure `state.currentUser` and `state.users` balances align with the caller.
  applySessionUser(state, userId);

  state.currentUser.paper_balance = startingBalance;
  refreshDerivedBalances(state);

  // Cancel/clear any open paper practice positions in the demo UI/API.
  if (Array.isArray(state.portfolio?.openBets)) {
    state.portfolio.openBets = state.portfolio.openBets.filter((b) => !b.isPaper);
  }
  if (Array.isArray(state.openOrders)) {
    state.openOrders = state.openOrders.filter((o) => !o.isPaper);
  }

  refreshDerivedBalances(state);
  return getDemoState(userId);
}

export function placeDemoBet({ marketId, side, betDraft, isPaper = false }) {
  const state = getStore();
  const market = getSelectedMarketFromState(state, marketId);
  if (market.status && market.status !== "active") {
    return {
      ok: false,
      message: `This market is ${market.status} and is not accepting bets.`,
      state: getDemoState(),
    };
  }
  const result = calculatePayout({
    stake: betDraft.stake,
    withdrawableShare: betDraft.withdrawableShare,
    bonusShare: betDraft.bonusShare,
    market,
    adminConfig: state.adminConfig,
  });

  if (result.totalStake <= 0) {
    return { ok: false, message: "Enter a valid stake before placing a bet.", state: getDemoState() };
  }

  if (isPaper) {
    if (result.totalStake > (state.currentUser.paper_balance ?? 0)) {
      return { ok: false, message: "Insufficient paper balance for this stake.", state: getDemoState() };
    }
    state.currentUser.paper_balance -= result.totalStake;
  } else {
    if (
      result.withdrawableStake > state.currentUser.withdrawable_balance ||
      result.bonusStake > state.currentUser.bonus_balance
    ) {
      return { ok: false, message: "Insufficient balance for this funding mix.", state: getDemoState() };
    }

    state.currentUser.withdrawable_balance -= result.withdrawableStake;
    state.currentUser.bonus_balance -= result.bonusStake;
  }
  const betId = `bet_${Date.now()}`;

  market.recentActivity.unshift({
    user: state.currentUser.name,
    action: `Bet ${side}`,
    amount: result.totalStake,
    time: "Just now",
  });
  state.portfolio.openBets.unshift({
    id: betId,
    marketId: market.id,
    market: market.title,
    side,
    stake: result.totalStake,
    status: "Open",
    isPaper,
    funding: `${Math.round(result.withdrawableRatio * 100)}% withdrawable / ${Math.round(
      result.bonusRatio * 100,
    )}% bonus`,
    withdrawableStake: isPaper ? 0 : result.withdrawableStake,
    bonusStake: isPaper ? 0 : result.bonusStake,
    placedAt: new Date().toISOString().slice(0, 10),
  });
  if (isPaper) {
    addLedgerEntry(state, {
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: betId,
      transaction_type: "debit",
      amount: result.totalStake,
      currency_type: "paper",
      source: "paper_bet_placed",
      metadata: `Placed ${side} paper bet on ${market.title}`,
    });
  } else {
    addLedgerEntries(
      state,
      createBetLedgerEntries({
        userId: state.currentUser.id,
        marketId: market.id,
        betId,
        side,
        marketTitle: market.title,
        withdrawableStake: result.withdrawableStake,
        bonusStake: result.bonusStake,
      }),
    );
  }
  refreshDerivedBalances(state);

  return {
    ok: true,
    message: `Placed a ${side} bet on "${market.title}" for $${result.totalStake.toFixed(2)}.`,
    state: getDemoState(),
  };
}

export function getDemoOrders() {
  const state = getStore();
  return state.openOrders || [];
}

export function createDemoLimitOrder({ marketId, side, quantity, limitPrice, isPaper = false, limitExpiry }) {
  const state = getStore();
  const market = getSelectedMarketFromState(state, marketId);
  if (market.status && market.status !== "active") {
    return { ok: false, message: `This market is ${market.status} and is not accepting orders.`, state: getDemoState() };
  }

  const order = {
    id: `order_${Date.now()}`,
    marketId: market.id,
    market: market.title,
    side,
    quantity: Number(quantity),
    limitPrice: Number(limitPrice),
    limitPriceCents: Math.round(Number(limitPrice) * 100),
    currentPrice: side === "BUY_YES" || side === "YES"
      ? (market.yesPrice ?? 0.5)
      : (market.noPrice ?? 0.5),
    dollarCost: Number((Number(quantity) * Number(limitPrice)).toFixed(2)),
    isPaper,
    expiresAt: limitExpiry ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
    createdAt: new Date().toISOString(),
    status: "OPEN",
  };

  state.openOrders = [order, ...(state.openOrders || [])];
  return {
    ok: true,
    message: `Limit order placed: ${order.side} at ${order.limitPriceCents}¢`,
    orders: state.openOrders,
    state: getDemoState(),
  };
}

export function cancelDemoOrder(orderId) {
  const state = getStore();
  const before = state.openOrders || [];
  state.openOrders = before.filter((order) => order.id !== orderId);
  if (state.openOrders.length === before.length) {
    return { ok: false, message: "Order not found.", state: getDemoState() };
  }
  return { ok: true, message: "Order cancelled.", orders: state.openOrders, state: getDemoState() };
}

export function resolveDemoMarket({ activeId, result }) {
  const state = getStore();
  const active = state.activeMarkets.find((market) => market.id === activeId);
  state.activeMarkets = state.activeMarkets.filter((market) => market.id !== activeId);
  if (!active) {
    return { ok: false, message: "Market was not found in the active queue.", state: getDemoState() };
  }

  const marketDetails = state.markets.find(
    (market) => market.id === active.marketId || market.title === active.title,
  );
  if (marketDetails) {
    marketDetails.status = result === "VOID" ? "voided" : "resolved";
    marketDetails.settlementTime = new Date().toISOString();
  }
  const matchingOpenBets = state.portfolio.openBets.filter(
    (bet) => bet.marketId === active.marketId || bet.market === active.title,
  );
  const unsettledOpenBets = state.portfolio.openBets.filter(
    (bet) => !(bet.marketId === active.marketId || bet.market === active.title),
  );

  matchingOpenBets.forEach((bet) => {
    if (result === "VOID" && marketDetails) {
      state.currentUser.withdrawable_balance += bet.withdrawableStake ?? 0;
      state.currentUser.bonus_balance += bet.bonusStake ?? 0;
      addLedgerEntries(
        state,
        createRefundLedgerEntries({
          userId: state.currentUser.id,
          market: marketDetails,
          bet,
        }),
      );
      state.portfolio.pastBets.unshift({
        market: bet.market,
        side: bet.side,
        payout: bet.withdrawableStake ?? 0,
        boost: bet.bonusStake ?? 0,
        settlement: "Voided. Original withdrawable and bonus stakes were refunded.",
      });
      return;
    }

    if (bet.side === result && marketDetails) {
      const settlement = calculatePayout({
        stake: bet.stake,
        withdrawableShare: bet.withdrawableStake ?? bet.stake,
        bonusShare: bet.bonusStake ?? 0,
        market: marketDetails,
        adminConfig: state.adminConfig,
      });
      state.currentUser.withdrawable_balance += settlement.totalWithdrawableReturn;
      state.currentUser.bonus_balance += settlement.totalBonusReturn;
      addLedgerEntries(
        state,
        createSettlementLedgerEntries({
          userId: state.currentUser.id,
          market: marketDetails,
          bet,
          settlement,
        }),
      );
      state.portfolio.pastBets.unshift({
        market: bet.market,
        side: bet.side,
        payout: settlement.totalWithdrawableReturn,
        boost: settlement.totalBonusReturn - settlement.bonusPayoutFromNormal,
        settlement: `Won. $${settlement.totalWithdrawableReturn.toFixed(2)} to withdrawable and $${settlement.totalBonusReturn.toFixed(2)} to bonus.`,
      });
    } else {
      state.portfolio.pastBets.unshift({
        market: bet.market,
        side: bet.side,
        payout: 0,
        boost: 0,
        settlement: `Lost. No payout after resolution to ${result}.`,
      });
    }
  });

  state.portfolio.openBets = unsettledOpenBets;
  state.resolvedMarkets.unshift({
    id: `resolved_${Date.now()}`,
    title: active.title,
    result,
    resolvedAt: new Date().toISOString().slice(0, 10),
    resolverNotes:
      result === "VOID"
        ? "Voided through demo admin workflow and refunded original stakes."
        : `Resolved through demo admin workflow using ${marketDetails?.category ?? "market"} criteria.`,
    evidenceLinks: marketDetails?.evidenceLinks ?? [],
  });
  refreshDerivedBalances(state);

  return {
    ok: true,
    message: `Resolved "${active.title}" as ${result}.`,
    state: getDemoState(),
  };
}

export function submitDemoMarket({ draft, userId }) {
  const state = getStore();
  const errors = validateCreateMarketDraft(draft);

  if (hasValidationErrors(errors)) {
    return {
      ok: false,
      message: "Fix the highlighted market fields before submitting for review.",
      errors,
      state: getDemoState(),
    };
  }

  const submitter = state.users.find((user) => user.id === userId) ?? state.currentUser;
  const market = {
    id: `pending_${Date.now()}`,
    title: draft.title.trim(),
    submittedBy: submitter.username ?? state.currentUser.username,
    createdAt: new Date().toISOString().slice(0, 10),
    category: draft.category,
    description: draft.description.trim(),
    closeDate: draft.closeDate,
    sourceUrl: draft.sourceUrl?.trim() || "",
  };

  state.pendingMarkets.unshift(market);
  state.createMarketDraft = {
    title: "",
    category: "Sports",
    closeDate: "",
    description: "",
    sourceUrl: "",
  };

  return {
    ok: true,
    message: `Submitted "${market.title}" for admin review.`,
    state: getDemoState(),
  };
}

export function approveDemoMarket({ pendingId }) {
  const state = getStore();
  const pending = state.pendingMarkets.find((market) => market.id === pendingId);

  if (!pending) {
    return { ok: false, message: "Pending market was not found.", state: getDemoState() };
  }

  const timestamp = Date.now();
  state.pendingMarkets = state.pendingMarkets.filter((market) => market.id !== pendingId);
  state.activeMarkets.unshift({
    id: `active_${timestamp}`,
    marketId: `market_${timestamp}`,
    title: pending.title,
    volume: 0,
    status: "Active",
  });

  const newMarketId = state.activeMarkets[0].marketId;
  const template = getResolutionTemplate(pending.category);
  state.markets.unshift({
    status: "active",
    id: newMarketId,
    title: pending.title,
    category: pending.category,
    volume: 0,
    endDate: pending.closeDate ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    closeTime: pending.closeDate ? `${pending.closeDate}T23:59:00Z` : null,
    settlementTime: null,
    yesPrice: 0.5,
    noPrice: 0.5,
    eligibleForBonus: state.adminConfig.bonusFundsEligibility === "all_markets",
    friendsBoosting: 0,
    friendGroup: [],
    resolutionTemplate: template.template,
    resolutionChecklist: template.checklist,
    evidenceLinks: [
      {
        label: template.evidenceSource,
        url: pending.sourceUrl || "",
        sourceType: pending.sourceUrl ? "submitted" : "planned",
      },
    ],
    description:
      pending.description ||
      "User-submitted market approved by an admin. Resolution criteria should be finalized before launch.",
    recentActivity: [],
  });

  return {
    ok: true,
    message: `Approved "${pending.title}" and moved it to active markets.`,
    state: getDemoState(),
  };
}

export function rejectDemoMarket({ pendingId }) {
  const state = getStore();
  const pending = state.pendingMarkets.find((market) => market.id === pendingId);
  state.pendingMarkets = state.pendingMarkets.filter((market) => market.id !== pendingId);

  if (!pending) {
    return { ok: false, message: "Pending market was not found.", state: getDemoState() };
  }

  return {
    ok: true,
    message: `Rejected "${pending.title}".`,
    state: getDemoState(),
  };
}

export function updateDemoMarketLifecycle({ activeId, status }) {
  const allowedStatuses = new Set(["active", "paused"]);
  const state = getStore();
  const active = state.activeMarkets.find((market) => market.id === activeId);

  if (!active) {
    return { ok: false, message: "Active market was not found.", state: getDemoState() };
  }

  if (!allowedStatuses.has(status)) {
    return { ok: false, message: "Market status change is not allowed.", state: getDemoState() };
  }

  const market = state.markets.find(
    (item) => item.id === active.marketId || item.title === active.title,
  );
  if (market) {
    market.status = status;
  }
  active.status = status === "paused" ? "Paused" : "Active";

  return {
    ok: true,
    message: `${active.title} is now ${status}.`,
    state: getDemoState(),
  };
}

export function sendDemoFriendInvite({ username, userId }) {
  const state = getStore();
  applySessionUser(state, userId);
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return { ok: false, message: "Enter a username to send an invite.", state: getDemoState() };
  }

  const requester = state.users.find((user) => user.id === state.currentUser.id);
  const addressee = state.users.find((user) => user.username?.toLowerCase() === normalized);

  if (normalized === requester?.username?.toLowerCase()) {
    return { ok: false, message: "You cannot invite your own account.", state: getDemoState() };
  }

  if (!addressee) {
    return {
      ok: false,
      message: `No demo account exists for ${normalized}. Try @taylor from the test account.`,
      state: getDemoState(state.currentUser.id),
    };
  }

  const alreadyFriend = state.friends.list.some(
    (friend) =>
      friend.username?.toLowerCase() === normalized ||
      (friend.requesterId === requester.id && friend.addresseeId === addressee.id) ||
      (friend.requesterId === addressee.id && friend.addresseeId === requester.id),
  );
  const alreadyPending = state.friends.pending.some(
    (request) =>
      request.username?.toLowerCase() === normalized ||
      (request.requesterId === requester.id && request.addresseeId === addressee.id) ||
      (request.requesterId === addressee.id && request.addresseeId === requester.id),
  );

  if (alreadyFriend || alreadyPending) {
    return {
      ok: false,
      message: `${normalized} is already in your friend graph or pending queue.`,
      state: getDemoState(),
    };
  }

  state.friends.pending.unshift({
    name: addressee.name,
    username: addressee.username,
    direction: "outgoing",
    requesterId: requester.id,
    addresseeId: addressee.id,
  });
  state.friendInviteDraft = "";

  return {
    ok: true,
    message: `Sent a friend invite to ${normalized}.`,
    state: getDemoState(requester.id),
  };
}

function demoFriendRelationStatus(state, requester, addressee) {
  const accepted = state.friends.list.some(
    (friend) =>
      friend.username?.toLowerCase() === addressee.username?.toLowerCase() ||
      (friend.requesterId === requester.id && friend.addresseeId === addressee.id) ||
      (friend.requesterId === addressee.id && friend.addresseeId === requester.id),
  );
  if (accepted) return "friends";

  const pending = state.friends.pending.find(
    (request) =>
      request.username?.toLowerCase() === addressee.username?.toLowerCase() ||
      (request.requesterId === requester.id && request.addresseeId === addressee.id) ||
      (request.requesterId === addressee.id && request.addresseeId === requester.id),
  );
  if (!pending) return "not_connected";
  return pending.requesterId === requester.id ? "pending_outgoing" : "pending_incoming";
}

export function searchDemoFriends({ query, userId }) {
  const state = getStore();
  applySessionUser(state, userId);
  const requester = state.users.find((user) => user.id === state.currentUser.id);
  const normalized = String(query || "").trim().toLowerCase().replace(/^@+/, "");

  if (!requester || normalized.length < 2) {
    return { ok: true, results: [] };
  }

  const results = state.users
    .filter((user) => user.id !== requester.id)
    .filter((user) => {
      const username = String(user.username || "").toLowerCase().replace(/^@+/, "");
      const name = String(user.name || "").toLowerCase();
      return username.includes(normalized) || name.includes(normalized);
    })
    .slice(0, 8)
    .map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      status: demoFriendRelationStatus(state, requester, user),
    }));

  return { ok: true, results };
}

export function handleDemoFriendRequest({ username, action, userId }) {
  const state = getStore();
  applySessionUser(state, userId);
  const normalized = normalizeUsername(username);
  const currentUserId = state.currentUser.id;
  const request = state.friends.pending.find((item) => {
    if (!item.requesterId || !item.addresseeId) {
      return item.username === normalized;
    }
    const visible = pendingRecordForUser(item, currentUserId, state);
    return visible?.username === normalized;
  });

  if (!request) {
    return { ok: false, message: "Friend request was not found.", state: getDemoState(currentUserId) };
  }

  state.friends.pending = state.friends.pending.filter((item) => item !== request);

  const visibleRequest = pendingRecordForUser(request, currentUserId, state) ?? request;
  const isIncoming = visibleRequest.direction === "incoming";
  if (action === "accept" && isIncoming) {
    state.friends.list.unshift({
      name: visibleRequest.name,
      username: visibleRequest.username,
      boostCount: 0,
      status: "Trusted",
      requesterId: request.requesterId,
      addresseeId: request.addresseeId,
    });
    return {
      ok: true,
      message: `Accepted ${visibleRequest.username} as a friend.`,
      state: getDemoState(currentUserId),
    };
  }

  if (action === "decline") {
    return {
      ok: true,
      message: `Declined ${visibleRequest.username}'s friend request.`,
      state: getDemoState(currentUserId),
    };
  }

  return {
    ok: true,
    message: `Canceled the pending invite to ${visibleRequest.username}.`,
    state: getDemoState(currentUserId),
  };
}

export function toggleDemoFriendBoost({ username, marketId, userId }) {
  const state = getStore();
  applySessionUser(state, userId);
  const currentUserId = state.currentUser.id;
  const friend = state.friends.list
    .map((record) => friendRecordForUser(record, currentUserId, state))
    .filter(Boolean)
    .find((item) => item.username === username);
  const market = getSelectedMarketFromState(state, marketId);

  if (!friend || !market) {
    return { ok: false, message: "Friend or market was not found.", state: getDemoState(currentUserId) };
  }

  if (!state.adminConfig.socialBoostsEnabled) {
    return {
      ok: false,
      message: "Social boosts are currently disabled by admin policy.",
      state: getDemoState(currentUserId),
    };
  }

  const boostName = getFriendBoostName(friend);
  const isBoosting = market.friendGroup.includes(boostName);

  if (isBoosting) {
    market.friendGroup = market.friendGroup.filter((name) => name !== boostName);
    friend.boostCount = Math.max(0, friend.boostCount - 1);
    market.friendsBoosting = market.friendGroup.length;
    return {
      ok: true,
      message: `${boostName} is no longer boosting "${market.title}".`,
      state: getDemoState(currentUserId),
    };
  }

  if (market.friendGroup.length >= state.adminConfig.maxGroupSize) {
    return {
      ok: false,
      message: `This market already has the max boost group size of ${state.adminConfig.maxGroupSize}.`,
      state: getDemoState(),
    };
  }

  market.friendGroup.push(boostName);
  friend.boostCount += 1;
  market.friendsBoosting = market.friendGroup.length;
  const matchingUser = state.users.find((user) => user.name === friend.name);
  const signals = getBoostRiskSignals({
    friend,
    market,
    markets: state.markets,
    adminConfig: state.adminConfig,
  });
  applyRiskSignalsToUser(matchingUser, signals);
  market.recentActivity.unshift({
    user: boostName,
    action: "Joined boost group",
    amount: 0,
    time: "Just now",
  });

  return {
    ok: true,
    message: signals.length
      ? `${boostName} is now boosting "${market.title}". Risk signals added for review.`
      : `${boostName} is now boosting "${market.title}".`,
    state: getDemoState(currentUserId),
  };
}

export function addDemoDeposit() {
  const state = getStore();
  addFunds(state, {
    amount: 25,
    currencyType: "withdrawable",
    source: "deposit",
    metadata: "Demo play-money deposit",
  });

  return {
    ok: true,
    message: "Added a $25 play-money deposit to withdrawable balance.",
    state: getDemoState(),
  };
}

export function grantDemoBonus() {
  const state = getStore();
  addFunds(state, {
    amount: 10,
    currencyType: "bonus",
    source: "admin_adjustment",
    metadata: "Demo admin bonus grant",
  });
  state.adminConfig.bonusLiability += 10;

  return {
    ok: true,
    message: "Granted a $10 bonus credit and updated bonus liability.",
    state: getDemoState(),
  };
}

export function updateDemoAdminConfig({ field, value }) {
  const state = getStore();

  if (!(field in state.adminConfig)) {
    return { ok: false, message: "Admin setting was not found.", state: getDemoState() };
  }

  state.adminConfig[field] = numericAdminFields.has(field) ? Number(value) : value;

  return {
    ok: true,
    message: "Admin settings updated.",
    state: getDemoState(),
  };
}

export function freezeDemoUser({ userId }) {
  const state = getStore();
  const user = state.users.find((item) => item.id === userId);

  if (!user) {
    return { ok: false, message: "User was not found.", state: getDemoState() };
  }

  user.frozen = !user.frozen;
  user.risk_status = user.frozen ? "frozen" : "review";
  if (user.id === state.currentUser.id) {
    state.currentUser.settings.riskStatus = user.risk_status;
  }
  addLedgerEntry(state, createAdminAdjustmentEntry({
    userId: user.id,
    amount: 0,
    metadata: user.frozen ? "Account frozen for manual review" : "Account unfrozen after review",
  }));

  return {
    ok: true,
    message: `${user.name} is now ${user.frozen ? "frozen" : "unfrozen"}.`,
    state: getDemoState(),
  };
}

export function clearDemoRiskReview({ userId }) {
  const state = getStore();
  const user = state.users.find((item) => item.id === userId);

  if (!user) {
    return { ok: false, message: "User was not found.", state: getDemoState() };
  }

  user.risk_status = "clear";
  user.risk_score = Math.min(user.risk_score, 20);
  user.frozen = false;
  user.risk_signals = ["Manual review cleared"];
  if (user.id === state.currentUser.id) {
    state.currentUser.settings.riskStatus = "clear";
  }

  return {
    ok: true,
    message: `${user.name} was cleared from the review queue.`,
    state: getDemoState(),
  };
}

export function removeDemoUserBonus({ userId }) {
  const state = getStore();
  const user = state.users.find((item) => item.id === userId);

  if (!user || user.bonus_balance <= 0) {
    return { ok: false, message: "No removable bonus balance was found.", state: getDemoState() };
  }

  const amount = Math.min(10, user.bonus_balance);
  user.bonus_balance -= amount;
  state.adminConfig.bonusLiability = Math.max(0, state.adminConfig.bonusLiability - amount);
  if (user.id === state.currentUser.id) {
    state.currentUser.bonus_balance = user.bonus_balance;
    refreshDerivedBalances(state);
  }
  addLedgerEntry(state, createAdminAdjustmentEntry({
    userId: user.id,
    amount,
    transactionType: "debit",
    metadata: "Promotional bonus removed during manual review",
  }));

  return {
    ok: true,
    message: `Removed $${amount.toFixed(2)} of bonus balance from ${user.name}.`,
    state: getDemoState(),
  };
}

export function updateDemoProfile({ name, email }) {
  const state = getStore();
  const cleanedName = String(name || "").trim();
  const cleanedEmail = String(email || "").trim().toLowerCase();

  if (cleanedName.length < 2) {
    return { ok: false, message: "Enter a display name with at least 2 characters.", state: getDemoState() };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    return { ok: false, message: "Enter a valid email address.", state: getDemoState() };
  }

  state.currentUser.name = cleanedName;
  state.currentUser.email = cleanedEmail;
  const user = state.users.find((item) => item.id === state.currentUser.id);
  if (user) {
    user.name = cleanedName;
    user.email = cleanedEmail;
  }

  return {
    ok: true,
    message: "Profile updated.",
    state: getDemoState(),
  };
}

export function updateDemoVerification({ type }) {
  const state = getStore();

  if (type === "email") {
    state.currentUser.settings.emailVerificationStatus = "verified";
    return {
      ok: true,
      message: "Email verification marked complete for the demo.",
      state: getDemoState(),
    };
  }

  if (type === "phone") {
    state.currentUser.settings.phoneVerificationStatus = "verified";
    return {
      ok: true,
      message: "Phone verification marked complete for the demo.",
      state: getDemoState(),
    };
  }

  if (type === "identity" || type === "payment" || type === "device") {
    state.currentUser.settings[`${type}VerificationStatus`] = "placeholder";
    return {
      ok: true,
      message: `${type} verification is reserved for a future real-money compliance provider.`,
      state: getDemoState(),
    };
  }

  return { ok: false, message: "Verification type was not recognized.", state: getDemoState() };
}
