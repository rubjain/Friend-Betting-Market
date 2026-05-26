const STORAGE_KEY = "agora-mvp-state";

const defaultState = {
  route: "landing",
  flashMessage: "",
  mobileNavOpen: false,
  friendInviteDraft: "",
  ledgerFilter: "all",
  filters: {
    query: "",
    category: "all",
  },
  currentUser: {
    id: "user_1",
    name: "Arush",
    username: "@arush",
    email: "arush@example.com",
    isAdmin: false,
    withdrawable_balance: 148,
    bonus_balance: 39,
    play_credit_balance: 187,
    settings: {
      bonusMarketEligibility: "eligible_only",
      betBonusUsage: "partial",
      phoneVerificationStatus: "placeholder",
      riskStatus: "monitor",
    },
  },
  adminConfig: {
    socialBoostsEnabled: true,
    maxGroupSize: 5,
    multiplierPerFriend: 0.05,
    maxMultiplier: 1.2,
    maxBonusPayoutPerUser: 250,
    maxBonusPayoutPerMarket: 800,
    dailyBonusPayoutLimit: 2500,
    bonusFundsEligibility: "eligible_only",
    bonusUsageMode: "partial",
    bonusLiability: 4820,
  },
  selectedMarketId: "market_1",
  betDraft: {
    side: "YES",
    stake: 10,
    withdrawableShare: 6,
    bonusShare: 4,
  },
  markets: [
    {
      id: "market_1",
      title: "Will the Knicks make the 2026 Eastern Conference Finals?",
      category: "NBA",
      volume: 12400,
      endDate: "2026-05-21",
      yesPrice: 0.54,
      noPrice: 0.46,
      eligibleForBonus: true,
      friendsBoosting: 4,
      friendGroup: ["Maya", "Jordan", "Theo", "Ava"],
      description: "Place a social prediction on whether the Knicks will reach the 2026 Eastern Conference Finals. Friend boosts increase only the bonus portion of winnings.",
      recentActivity: [
        { user: "Maya", action: "Bet YES", amount: 12, time: "5 min ago" },
        { user: "Theo", action: "Invited 2 friends", amount: 0, time: "18 min ago" },
        { user: "Jordan", action: "Bet NO", amount: 18, time: "40 min ago" },
      ],
    },
    {
      id: "market_2",
      title: "Will the Dodgers win the NL West in 2026?",
      category: "MLB",
      volume: 30120,
      endDate: "2026-05-31",
      yesPrice: 0.49,
      noPrice: 0.51,
      eligibleForBonus: true,
      friendsBoosting: 2,
      friendGroup: ["Riley", "Noah"],
      description: "Season-long MLB division market with official standings as the settlement source.",
      recentActivity: [
        { user: "Noah", action: "Bet YES", amount: 20, time: "8 min ago" },
        { user: "Riley", action: "Bet NO", amount: 7, time: "22 min ago" },
      ],
    },
    {
      id: "market_3",
      title: "Will the Lakers win their next playoff game?",
      category: "NBA",
      volume: 18900,
      endDate: "2026-06-30",
      yesPrice: 0.57,
      noPrice: 0.43,
      eligibleForBonus: false,
      friendsBoosting: 3,
      friendGroup: ["Lena", "Sofia", "Owen"],
      description: "NBA playoff market with official final score settlement and injury-report inputs.",
      recentActivity: [
        { user: "Owen", action: "Bet YES", amount: 9, time: "12 min ago" },
        { user: "Lena", action: "Invited 1 friend", amount: 0, time: "1 hr ago" },
      ],
    },
  ],
  friends: {
    list: [
      { name: "Maya Patel", username: "@maya", boostCount: 6, status: "Trusted" },
      { name: "Jordan Lee", username: "@jordy", boostCount: 4, status: "Trusted" },
      { name: "Theo Nguyen", username: "@theo", boostCount: 2, status: "Monitor" },
    ],
    pending: [
      { name: "Ava Kim", username: "@ava", direction: "incoming" },
      { name: "Riley West", username: "@riley", direction: "outgoing" },
    ],
  },
  portfolio: {
    openBets: [
      { id: "bet_seed_1", marketId: "market_1", market: "Will the Knicks make the 2026 Eastern Conference Finals?", side: "YES", stake: 10, status: "Open", funding: "60% withdrawable / 40% bonus", withdrawableStake: 6, bonusStake: 4, placedAt: "2026-04-25" },
      { id: "bet_seed_2", marketId: "market_2", market: "Will the Dodgers win the NL West in 2026?", side: "NO", stake: 16, status: "Open", funding: "100% withdrawable", withdrawableStake: 16, bonusStake: 0, placedAt: "2026-04-25" },
    ],
    pastBets: [
      { market: "Lakers make playoffs", side: "YES", payout: 20, boost: 4, settlement: "Settled to $20 withdrawable + $4 bonus" },
      { market: "Lakers make playoffs", side: "NO", payout: 18, boost: 0, settlement: "Settled fully to withdrawable" },
    ],
  },
  createMarketDraft: {
    title: "",
    category: "NBA",
    closeDate: "",
    description: "",
  },
  pendingMarkets: [
    { id: "pending_1", title: "Will the Jets sign a veteran QB by camp?", submittedBy: "@ava", createdAt: "2026-04-25", category: "NFL" },
    { id: "pending_2", title: "Will the Yankees win their next series?", submittedBy: "@maya", createdAt: "2026-04-26", category: "MLB" },
  ],
  activeMarkets: [
    { id: "active_1", marketId: "market_1", title: "Will the Knicks make the 2026 Eastern Conference Finals?", volume: 12400, status: "Active" },
    { id: "active_2", marketId: "market_2", title: "Will the Dodgers win the NL West in 2026?", volume: 30120, status: "Active" },
  ],
  resolvedMarkets: [
    { id: "resolved_1", title: "Lakers make playoffs", result: "YES", resolvedAt: "2026-03-28" },
  ],
  users: [
    { id: "user_1", name: "Arush", withdrawable_balance: 148, bonus_balance: 39, risk_status: "monitor", risk_score: 42, frozen: false, risk_signals: ["Shared device signal", "Repeat boost group"] },
    { id: "user_2", name: "Maya Patel", withdrawable_balance: 92, bonus_balance: 22, risk_status: "clear", risk_score: 12, frozen: false, risk_signals: ["Verified email"] },
    { id: "user_3", name: "Jordan Lee", withdrawable_balance: 76, bonus_balance: 14, risk_status: "clear", risk_score: 18, frozen: false, risk_signals: ["Normal activity"] },
    { id: "user_4", name: "Theo Nguyen", withdrawable_balance: 41, bonus_balance: 58, risk_status: "review", risk_score: 71, frozen: false, risk_signals: ["High bonus velocity", "Dense friend boosting"] },
  ],
  ledger: [],
};

const state = loadState();

function money(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function signedMoney(entry) {
  const prefix = entry.transaction_type === "debit" ? "-" : "+";
  return `${prefix}${money(entry.amount)}`;
}

function loadState() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return structuredClone(defaultState);
    }
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      flashMessage: "",
      mobileNavOpen: false,
      friendInviteDraft: parsed.friendInviteDraft || "",
      ledgerFilter: parsed.ledgerFilter || defaultState.ledgerFilter,
      filters: { ...defaultState.filters, ...(parsed.filters || {}) },
      currentUser: { ...defaultState.currentUser, ...(parsed.currentUser || {}) },
      adminConfig: { ...defaultState.adminConfig, ...(parsed.adminConfig || {}) },
      betDraft: { ...defaultState.betDraft, ...(parsed.betDraft || {}) },
      createMarketDraft: { ...defaultState.createMarketDraft, ...(parsed.createMarketDraft || {}) },
      friends: {
        ...defaultState.friends,
        ...(parsed.friends || {}),
        list: parsed.friends?.list || defaultState.friends.list,
        pending: parsed.friends?.pending || defaultState.friends.pending,
      },
      portfolio: {
        ...defaultState.portfolio,
        ...(parsed.portfolio || {}),
        openBets: parsed.portfolio?.openBets || defaultState.portfolio.openBets,
        pastBets: parsed.portfolio?.pastBets || defaultState.portfolio.pastBets,
      },
      markets: parsed.markets || defaultState.markets,
      pendingMarkets: parsed.pendingMarkets || defaultState.pendingMarkets,
      activeMarkets: parsed.activeMarkets || defaultState.activeMarkets,
      resolvedMarkets: parsed.resolvedMarkets || defaultState.resolvedMarkets,
      users: normalizeUsers(parsed.users || defaultState.users),
      ledger: normalizeLedger(parsed.ledger || defaultState.ledger),
    };
  } catch (error) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  const serializable = {
    ...state,
    flashMessage: "",
    mobileNavOpen: false,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

function setFlashMessage(message) {
  state.flashMessage = message;
}

function dismissFlashMessage() {
  state.flashMessage = "";
  render();
}

function formatVolume(amount) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function titleCase(str) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function normalizeUsers(users) {
  return users.map((user) => ({
    risk_score: user.risk_status === "clear" ? 12 : 48,
    frozen: false,
    risk_signals: user.risk_status === "clear" ? ["Normal activity"] : ["Needs manual review"],
    ...user,
  }));
}

function normalizeLedger(entries) {
  return entries.map((entry) => {
    if (entry.source === "market_payout" || entry.source === "social_boost" || entry.source === "deposit" || entry.source === "referral_bonus") {
      return { ...entry, transaction_type: "credit" };
    }

    if (entry.source === "bet_placed") {
      return { ...entry, transaction_type: "debit" };
    }

    return entry;
  });
}

function getRiskLabel(score) {
  if (score >= 70) {
    return "High";
  }
  if (score >= 40) {
    return "Monitor";
  }
  return "Clear";
}

function getLedgerEntries() {
  const userLedger = state.ledger.filter((entry) => entry.user_id === state.currentUser.id);

  if (state.ledgerFilter === "all") {
    return userLedger;
  }
  return userLedger.filter((entry) => entry.currency_type === state.ledgerFilter || entry.source === state.ledgerFilter);
}

function getSelectedMarket() {
  return state.markets.find((market) => market.id === state.selectedMarketId) ?? state.markets[0];
}

function getMultiplier(market) {
  if (!state.adminConfig.socialBoostsEnabled) {
    return 1;
  }

  const eligibleFriendCount = Math.min(market.friendsBoosting, state.adminConfig.maxGroupSize);
  const rawMultiplier = 1 + eligibleFriendCount * state.adminConfig.multiplierPerFriend;
  return Math.min(rawMultiplier, state.adminConfig.maxMultiplier);
}

function normalizeFunding({ stake, withdrawableShare, bonusShare, market }) {
  const requestedStake = Math.max(0, Number(stake) || 0);
  let withdrawableStake = Math.max(0, Number(withdrawableShare) || 0);
  let requestedBonusStake = Math.max(0, Number(bonusShare) || 0);
  let note = "";

  const bonusAllowedForMarket =
    state.adminConfig.bonusFundsEligibility === "all_markets" || market.eligibleForBonus;

  if (!bonusAllowedForMarket) {
    requestedBonusStake = 0;
    note = "Bonus balance is disabled on this market by admin policy.";
  }

  if (state.adminConfig.bonusUsageMode === "none") {
    requestedBonusStake = 0;
    note = "Bonus balance usage is currently disabled by admin policy.";
  }

  if (state.adminConfig.bonusUsageMode === "full" && requestedStake > 0) {
    requestedBonusStake = requestedStake;
    withdrawableStake = 0;
    note = "This market is configured to use bonus balance first.";
  }

  withdrawableStake = Math.min(requestedStake, withdrawableStake);
  requestedBonusStake = Math.min(requestedStake - withdrawableStake, requestedBonusStake);

  const normalizedTotalStake = withdrawableStake + requestedBonusStake;

  return {
    totalStake: normalizedTotalStake,
    withdrawableStake,
    bonusStake: requestedBonusStake,
    note,
  };
}

function calculatePayout({ stake, withdrawableShare, bonusShare, market }) {
  const funding = normalizeFunding({ stake, withdrawableShare, bonusShare, market });
  const impliedOddsMultiplier = 2;
  const normalPayout = funding.totalStake * impliedOddsMultiplier;
  const multiplier = getMultiplier(market);
  const boostedPayout = normalPayout * multiplier;
  const socialBonus = Math.max(0, boostedPayout - normalPayout);
  const withdrawableRatio = funding.totalStake === 0 ? 0 : funding.withdrawableStake / funding.totalStake;
  const bonusRatio = funding.totalStake === 0 ? 0 : funding.bonusStake / funding.totalStake;

  return {
    totalStake: funding.totalStake,
    normalPayout,
    boostedPayout,
    socialBonus,
    withdrawablePayout: normalPayout * withdrawableRatio,
    bonusPayoutFromNormal: normalPayout * bonusRatio,
    totalWithdrawableReturn: normalPayout * withdrawableRatio,
    totalBonusReturn: normalPayout * bonusRatio + socialBonus,
    multiplier,
    withdrawableRatio,
    bonusRatio,
    withdrawableStake: funding.withdrawableStake,
    bonusStake: funding.bonusStake,
    note: funding.note,
  };
}

function seedLedger() {
  if (state.ledger.length) {
    return;
  }

  const market = state.markets.find((item) => item.id === "market_1") ?? getSelectedMarket();
  const example = calculatePayout({
    stake: 10,
    withdrawableShare: 6,
    bonusShare: 4,
    market,
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

seedLedger();

function refreshDerivedBalances() {
  state.currentUser.play_credit_balance = state.currentUser.withdrawable_balance + state.currentUser.bonus_balance;
  const currentUserIndex = state.users.findIndex((user) => user.id === state.currentUser.id);
  if (currentUserIndex >= 0) {
    state.users[currentUserIndex] = {
      ...state.users[currentUserIndex],
      withdrawable_balance: state.currentUser.withdrawable_balance,
      bonus_balance: state.currentUser.bonus_balance,
      risk_status: state.currentUser.settings.riskStatus,
    };
  }
}

function addLedgerEntry(entry) {
  state.ledger.unshift({
    timestamp: new Date().toISOString(),
    metadata: "",
    ...entry,
  });
}

function addFunds({ amount, currencyType, source, metadata }) {
  if (currencyType === "withdrawable") {
    state.currentUser.withdrawable_balance += amount;
  } else {
    state.currentUser.bonus_balance += amount;
  }
  addLedgerEntry({
    user_id: state.currentUser.id,
    market_id: null,
    bet_id: null,
    transaction_type: "credit",
    amount,
    currency_type: currencyType,
    source,
    metadata,
  });
  refreshDerivedBalances();
}

function resetDemoState() {
  window.localStorage.removeItem(STORAGE_KEY);
  const reset = structuredClone(defaultState);
  Object.keys(state).forEach((key) => {
    delete state[key];
  });
  Object.assign(state, reset);
  seedLedger();
  setFlashMessage("Demo state reset to the default sample data.");
  render();
}

function addDemoDeposit() {
  addFunds({
    amount: 25,
    currencyType: "withdrawable",
    source: "deposit",
    metadata: "Demo play-money deposit",
  });
  setFlashMessage("Added a $25 play-money deposit to withdrawable balance.");
  render();
}

function grantDemoBonus() {
  addFunds({
    amount: 10,
    currencyType: "bonus",
    source: "admin_adjustment",
    metadata: "Demo admin bonus grant",
  });
  state.adminConfig.bonusLiability += 10;
  setFlashMessage("Granted a $10 bonus credit and updated bonus liability.");
  render();
}

function setLedgerFilter(filter) {
  state.ledgerFilter = filter;
  render();
}

function freezeUser(userId) {
  const user = state.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  user.frozen = !user.frozen;
  user.risk_status = user.frozen ? "frozen" : "review";
  if (user.id === state.currentUser.id) {
    state.currentUser.settings.riskStatus = user.risk_status;
  }
  addLedgerEntry({
    user_id: user.id,
    market_id: null,
    bet_id: null,
    transaction_type: "credit",
    amount: 0,
    currency_type: "bonus",
    source: "admin_adjustment",
    metadata: user.frozen ? "Account frozen for manual review" : "Account unfrozen after review",
  });
  setFlashMessage(`${user.name} is now ${user.frozen ? "frozen" : "unfrozen"}.`);
  render();
}

function clearRiskReview(userId) {
  const user = state.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  user.risk_status = "clear";
  user.risk_score = Math.min(user.risk_score, 20);
  user.frozen = false;
  user.risk_signals = ["Manual review cleared"];
  if (user.id === state.currentUser.id) {
    state.currentUser.settings.riskStatus = "clear";
  }
  setFlashMessage(`${user.name} was cleared from the review queue.`);
  render();
}

function removeUserBonus(userId) {
  const user = state.users.find((item) => item.id === userId);
  if (!user || user.bonus_balance <= 0) {
    return;
  }

  const amount = Math.min(10, user.bonus_balance);
  user.bonus_balance -= amount;
  state.adminConfig.bonusLiability = Math.max(0, state.adminConfig.bonusLiability - amount);
  if (user.id === state.currentUser.id) {
    state.currentUser.bonus_balance = user.bonus_balance;
    refreshDerivedBalances();
  }
  addLedgerEntry({
    user_id: user.id,
    market_id: null,
    bet_id: null,
    transaction_type: "debit",
    amount,
    currency_type: "bonus",
    source: "admin_adjustment",
    metadata: "Promotional bonus removed during manual review",
  });
  setFlashMessage(`Removed ${money(amount)} of bonus balance from ${user.name}.`);
  render();
}

function setRoute(route) {
  state.route = route;
  state.mobileNavOpen = false;
  if (window.location.hash !== `#${route}`) {
    window.location.hash = route;
    return;
  }
  render();
}

function toggleMobileNav() {
  state.mobileNavOpen = !state.mobileNavOpen;
  render();
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

function sendFriendInvite() {
  const username = normalizeUsername(state.friendInviteDraft);

  if (!username) {
    setFlashMessage("Enter a username to send an invite.");
    render();
    return;
  }

  if (username === state.currentUser.username.toLowerCase()) {
    setFlashMessage("You cannot invite your own account.");
    render();
    return;
  }

  const alreadyFriend = state.friends.list.some((friend) => friend.username.toLowerCase() === username);
  const alreadyPending = state.friends.pending.some((request) => request.username.toLowerCase() === username);

  if (alreadyFriend || alreadyPending) {
    setFlashMessage(`${username} is already in your friend graph or pending queue.`);
    render();
    return;
  }

  state.friends.pending.unshift({
    name: nameFromUsername(username),
    username,
    direction: "outgoing",
  });
  state.friendInviteDraft = "";
  setFlashMessage(`Sent a friend invite to ${username}.`);
  render();
}

function handleFriendRequest(username, action) {
  const request = state.friends.pending.find((item) => item.username === username);
  if (!request) {
    return;
  }

  state.friends.pending = state.friends.pending.filter((item) => item.username !== username);

  if (action === "accept" && request.direction === "incoming") {
    state.friends.list.unshift({
      name: request.name,
      username: request.username,
      boostCount: 0,
      status: "Trusted",
    });
    setFlashMessage(`Accepted ${request.username} as a friend.`);
  } else if (action === "decline") {
    setFlashMessage(`Declined ${request.username}'s friend request.`);
  } else {
    setFlashMessage(`Canceled the pending invite to ${request.username}.`);
  }

  render();
}

function toggleFriendBoost(username) {
  const friend = state.friends.list.find((item) => item.username === username);
  const market = getSelectedMarket();

  if (!friend || !market) {
    return;
  }

  if (!state.adminConfig.socialBoostsEnabled) {
    setFlashMessage("Social boosts are currently disabled by admin policy.");
    render();
    return;
  }

  const boostName = getFriendBoostName(friend);
  const isBoosting = market.friendGroup.includes(boostName);

  if (isBoosting) {
    market.friendGroup = market.friendGroup.filter((name) => name !== boostName);
    friend.boostCount = Math.max(0, friend.boostCount - 1);
    setFlashMessage(`${boostName} is no longer boosting "${market.title}".`);
  } else {
    if (market.friendGroup.length >= state.adminConfig.maxGroupSize) {
      setFlashMessage(`This market already has the max boost group size of ${state.adminConfig.maxGroupSize}.`);
      render();
      return;
    }

    market.friendGroup.push(boostName);
    friend.boostCount += 1;
    market.recentActivity.unshift({
      user: boostName,
      action: "Joined boost group",
      amount: 0,
      time: "Just now",
    });
    setFlashMessage(`${boostName} is now boosting "${market.title}".`);
  }

  market.friendsBoosting = market.friendGroup.length;
  render();
}

function updateBetDraft(field, value) {
  state.betDraft[field] = Number(value);
  const total = (Number(state.betDraft.withdrawableShare) || 0) + (Number(state.betDraft.bonusShare) || 0);
  if (field === "stake" && total !== state.betDraft.stake) {
    const desiredStake = Number(value) || 0;
    const currentWithdrawable = Math.min(desiredStake, state.betDraft.withdrawableShare);
    state.betDraft.withdrawableShare = currentWithdrawable;
    state.betDraft.bonusShare = Math.max(0, desiredStake - currentWithdrawable);
  }
  render();
}

function placeBet(side) {
  state.betDraft.side = side;
  const market = getSelectedMarket();
  const result = calculatePayout({
    stake: state.betDraft.stake,
    withdrawableShare: state.betDraft.withdrawableShare,
    bonusShare: state.betDraft.bonusShare,
    market,
  });

  if (result.totalStake <= 0) {
    setFlashMessage("Enter a valid stake before placing a bet.");
    render();
    return;
  }

  if (result.withdrawableStake > state.currentUser.withdrawable_balance || result.bonusStake > state.currentUser.bonus_balance) {
    setFlashMessage("Insufficient balance for this funding mix.");
    render();
    return;
  }

  state.currentUser.withdrawable_balance -= result.withdrawableStake;
  state.currentUser.bonus_balance -= result.bonusStake;
  const betId = `bet_${Date.now()}`;

  const activity = {
    user: state.currentUser.name,
    action: `Bet ${side}`,
    amount: result.totalStake,
    time: "Just now",
  };

  market.recentActivity.unshift(activity);
  state.portfolio.openBets.unshift({
    id: betId,
    marketId: market.id,
    market: market.title,
    side,
    stake: result.totalStake,
    status: "Open",
    funding: `${Math.round(result.withdrawableRatio * 100)}% withdrawable / ${Math.round(result.bonusRatio * 100)}% bonus`,
    withdrawableStake: result.withdrawableStake,
    bonusStake: result.bonusStake,
    placedAt: new Date().toISOString().slice(0, 10),
  });
  addLedgerEntry({
    user_id: state.currentUser.id,
    market_id: market.id,
    bet_id: betId,
    transaction_type: "debit",
    amount: result.withdrawableStake,
    currency_type: "withdrawable",
    source: "bet_placed",
    metadata: `Placed ${side} bet on ${market.title}`,
  });
  if (result.bonusStake > 0) {
    addLedgerEntry({
      user_id: state.currentUser.id,
      market_id: market.id,
      bet_id: betId,
      transaction_type: "debit",
      amount: result.bonusStake,
      currency_type: "bonus",
      source: "bet_placed",
      metadata: `Placed ${side} bet on ${market.title}`,
    });
  }
  setFlashMessage(`Placed a ${side} bet on "${market.title}" for ${money(result.totalStake)}.`);
  refreshDerivedBalances();
  render();
}

function createMarket(event) {
  event.preventDefault();
  const draft = state.createMarketDraft;
  if (!draft.title || !draft.description || !draft.closeDate) {
    window.alert("Please complete the market title, close date, and description.");
    return;
  }

  state.pendingMarkets.unshift({
    id: `pending_${Date.now()}`,
    title: draft.title,
    submittedBy: state.currentUser.username,
    createdAt: new Date().toISOString().slice(0, 10),
    category: draft.category,
  });

  state.createMarketDraft = {
    title: "",
    category: "NBA",
    closeDate: "",
    description: "",
  };
  setFlashMessage(`Submitted "${draft.title}" for admin review.`);

  setRoute("create");
}

function toggleAdminMode(checked) {
  state.currentUser.isAdmin = checked;
  if (!checked && state.route === "admin") {
    state.route = "profile";
  }
  render();
}

function updateAdminConfig(field, value) {
  const numericFields = new Set([
    "maxGroupSize",
    "multiplierPerFriend",
    "maxMultiplier",
    "maxBonusPayoutPerUser",
    "maxBonusPayoutPerMarket",
    "dailyBonusPayoutLimit",
    "bonusLiability",
  ]);

  state.adminConfig[field] = numericFields.has(field) ? Number(value) : value;
  setFlashMessage("Admin settings updated.");
  render();
}

function approveMarket(pendingId) {
  const pending = state.pendingMarkets.find((market) => market.id === pendingId);
  if (!pending) {
    return;
  }

  state.pendingMarkets = state.pendingMarkets.filter((market) => market.id !== pendingId);
  state.activeMarkets.unshift({
    id: `active_${Date.now()}`,
    marketId: `market_${Date.now()}`,
    title: pending.title,
    volume: 0,
    status: "Active",
  });
  const newMarketId = state.activeMarkets[0].marketId;
  state.markets.unshift({
    id: newMarketId,
    title: pending.title,
    category: pending.category,
    volume: 0,
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    yesPrice: 0.5,
    noPrice: 0.5,
    eligibleForBonus: state.adminConfig.bonusFundsEligibility === "all_markets",
    friendsBoosting: 0,
    friendGroup: [],
    description: "User-submitted market approved by an admin. Resolution criteria should be finalized before launch.",
    recentActivity: [],
  });
  setFlashMessage(`Approved "${pending.title}" and moved it to active markets.`);
  render();
}

function rejectMarket(pendingId) {
  const pending = state.pendingMarkets.find((market) => market.id === pendingId);
  state.pendingMarkets = state.pendingMarkets.filter((market) => market.id !== pendingId);
  if (pending) {
    setFlashMessage(`Rejected "${pending.title}".`);
  }
  render();
}

function resolveActiveMarket(activeId, result) {
  const active = state.activeMarkets.find((market) => market.id === activeId);
  state.activeMarkets = state.activeMarkets.filter((market) => market.id !== activeId);
  if (!active) {
    return;
  }

  const marketDetails = state.markets.find((market) => market.id === active.marketId || market.title === active.title);
  const matchingOpenBets = state.portfolio.openBets.filter((bet) => bet.marketId === active.marketId || bet.market === active.title);
  const unsettledOpenBets = state.portfolio.openBets.filter((bet) => !(bet.marketId === active.marketId || bet.market === active.title));

  matchingOpenBets.forEach((bet) => {
    if (bet.side === result && marketDetails) {
      const settlement = calculatePayout({
        stake: bet.stake,
        withdrawableShare: bet.withdrawableStake ?? bet.stake,
        bonusShare: bet.bonusStake ?? 0,
        market: marketDetails,
      });
      state.currentUser.withdrawable_balance += settlement.totalWithdrawableReturn;
      state.currentUser.bonus_balance += settlement.totalBonusReturn;
      addLedgerEntry({
        user_id: state.currentUser.id,
        market_id: marketDetails.id,
        bet_id: bet.id,
        transaction_type: "credit",
        amount: settlement.totalWithdrawableReturn,
        currency_type: "withdrawable",
        source: "market_payout",
        metadata: `Resolved ${bet.side} winner on ${bet.market}`,
      });
      if (settlement.bonusPayoutFromNormal > 0) {
        addLedgerEntry({
          user_id: state.currentUser.id,
          market_id: marketDetails.id,
          bet_id: bet.id,
          transaction_type: "credit",
          amount: settlement.bonusPayoutFromNormal,
          currency_type: "bonus",
          source: "market_payout",
          metadata: `Bonus-funded portion returned on ${bet.market}`,
        });
      }
      if (settlement.socialBonus > 0) {
        addLedgerEntry({
          user_id: state.currentUser.id,
          market_id: marketDetails.id,
          bet_id: bet.id,
          transaction_type: "credit",
          amount: settlement.socialBonus,
          currency_type: "bonus",
          source: "social_boost",
          metadata: `Social boost applied at ${settlement.multiplier.toFixed(2)}x on ${bet.market}`,
        });
      }
      state.portfolio.pastBets.unshift({
        market: bet.market,
        side: bet.side,
        payout: settlement.totalWithdrawableReturn,
        boost: settlement.totalBonusReturn - settlement.bonusPayoutFromNormal,
        settlement: `Won. ${money(settlement.totalWithdrawableReturn)} to withdrawable and ${money(settlement.totalBonusReturn)} to bonus.`,
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
  });
  refreshDerivedBalances();
  setFlashMessage(`Resolved "${active.title}" as ${result}.`);
  render();
}

function renderNav() {
  const isMarketsRoute = state.route === "markets" || state.route === "market-detail";
  const routes = [
    ["markets", "Markets"],
    ["friends", "Friends"],
    ["portfolio", "Portfolio"],
    ["create", "Create Market"],
    ["profile", "Profile"],
  ];

  return `
    <header class="site-header">
      <div class="nav-wrap">
        <div class="brand">
          <div class="brand-mark">AG</div>
          <div class="brand-copy">
            <h1>Agora</h1>
            <p>Social prediction markets, designed for trust.</p>
          </div>
        </div>
        <button class="btn btn-ghost mobile-menu-button" id="mobile-menu-button" aria-expanded="${state.mobileNavOpen ? "true" : "false"}">
          ${state.mobileNavOpen ? "Close" : "Menu"}
        </button>
        <div class="nav-actions">
          <nav class="nav-links ${state.mobileNavOpen ? "open" : ""}">
            <a class="nav-link ${state.route === "landing" ? "active" : ""}" href="#landing" data-route="landing">Home</a>
            ${routes.map(([route, label]) => {
              const isActive = route === "markets" ? isMarketsRoute : state.route === route;
              return `<a class="nav-link ${isActive ? "active" : ""}" href="#${route}" data-route="${route}">${label}</a>`;
            }).join("")}
            ${state.currentUser.isAdmin ? `<a class="nav-link admin-link ${state.route === "admin" ? "active" : ""}" href="#admin" data-route="admin">Admin</a>` : ""}
          </nav>
          <label class="toggle">
            <input type="checkbox" ${state.currentUser.isAdmin ? "checked" : ""} id="admin-toggle">
            <span>Demo admin mode</span>
          </label>
        </div>
      </div>
    </header>
  `;
}

function renderFlash() {
  if (!state.flashMessage) {
    return "";
  }
  return `
    <div class="note-banner" style="margin-bottom: 18px;">
      <div class="row-between">
        <span>${state.flashMessage}</span>
        <button class="btn btn-ghost" id="dismiss-flash">Dismiss</button>
      </div>
    </div>
  `;
}

function renderLanding() {
  return `
    <section class="page ${state.route === "landing" ? "active" : ""}" data-page="landing">
      <div class="hero">
        <div class="hero-copy card">
          <span class="eyebrow">Responsive web MVP</span>
          <h2>Prediction markets that feel simple, social, and trustworthy.</h2>
          <p>Agora lets people create and join clear yes-or-no markets with friends, while keeping withdrawable funds and bonus boosts separate in the ledger.</p>
          <div class="button-row">
            <button class="btn btn-primary" data-route-jump="markets">Browse Markets</button>
            <button class="btn btn-secondary" data-route-jump="profile">Sign Up</button>
          </div>
        </div>
        <div class="hero-panel">
          <div>
            <div class="label">Example payout flow</div>
            <div class="metric-grid">
              <div class="metric-card">
                <div class="metric-label">Normal payout</div>
                <div class="metric-value">$20</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Social boost</div>
                <div class="metric-value">$4</div>
              </div>
            </div>
          </div>
          <div class="note-banner">
            A $10 winning bet with a 1.20x multiplier returns $20 to withdrawable balance and $4 to bonus balance.
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">Current markets</div>
          <div class="stat-value">${state.markets.length}</div>
        </div>
        <div class="stat-card">
          <div class="label">Tracked bonus liability</div>
          <div class="stat-value">${money(state.adminConfig.bonusLiability)}</div>
        </div>
        <div class="stat-card">
          <div class="label">Mobile-ready layout</div>
          <div class="stat-value">Desktop first</div>
        </div>
      </div>

      <section>
        <div class="section-head">
          <div>
            <h3>How it works</h3>
            <p>Clear actions, minimal friction, and transparent money movement.</p>
          </div>
        </div>
        <div class="step-grid">
          <article class="step-card">
            <div class="step-number">1</div>
            <h4>Browse or create a market</h4>
            <p>Pick a simple yes-or-no market or submit your own idea for admin approval.</p>
          </article>
          <article class="step-card">
            <div class="step-number">2</div>
            <h4>Bet with clear balances</h4>
            <p>Each bet shows how much comes from withdrawable funds versus bonus funds before you confirm.</p>
          </article>
          <article class="step-card">
            <div class="step-number">3</div>
            <h4>Settle transparently</h4>
            <p>Normal winnings route by funding source, while social boosts always credit to bonus balance.</p>
          </article>
        </div>
      </section>
    </section>
  `;
}

function renderMarkets() {
  const filteredMarkets = state.markets.filter((market) => {
    const matchesQuery = market.title.toLowerCase().includes(state.filters.query.toLowerCase());
    const matchesCategory = state.filters.category === "all" || market.category === state.filters.category;
    return matchesQuery && matchesCategory;
  });

  return `
    <section class="page ${state.route === "markets" ? "active" : ""}" data-page="markets">
      <div class="section-head">
        <div>
          <h3>Markets</h3>
          <p>Simple, searchable market cards with clear outcomes and lightweight decisions.</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="field">
          <input id="market-search" type="search" placeholder="Search markets" value="${state.filters.query}">
        </div>
        <div class="field">
          <select id="market-category">
            <option value="all" ${state.filters.category === "all" ? "selected" : ""}>All sports</option>
            <option value="NBA" ${state.filters.category === "NBA" ? "selected" : ""}>NBA</option>
            <option value="NFL" ${state.filters.category === "NFL" ? "selected" : ""}>NFL</option>
            <option value="MLB" ${state.filters.category === "MLB" ? "selected" : ""}>MLB</option>
            <option value="Soccer" ${state.filters.category === "Soccer" ? "selected" : ""}>Soccer</option>
          </select>
        </div>
      </div>
      <div class="market-grid">
        ${filteredMarkets.length ? filteredMarkets.map((market) => `
          <article class="market-card">
            <div class="market-top">
              <div>
                <div class="pill">${market.category}</div>
                <h4>${market.title}</h4>
              </div>
              <button class="btn btn-ghost" data-market-detail="${market.id}">View</button>
            </div>
            <p>${market.description}</p>
            <div class="info-list">
              <div class="info-row"><span class="market-meta">Volume</span><strong>${money(market.volume)}</strong></div>
              <div class="info-row"><span class="market-meta">End date</span><strong>${market.endDate}</strong></div>
              <div class="info-row"><span class="market-meta">Bonus eligible</span><strong>${market.eligibleForBonus ? "Yes" : "No"}</strong></div>
            </div>
            <div class="market-actions">
              <button class="btn btn-success" data-bet-side="YES" data-market-id="${market.id}">Bet Yes</button>
              <button class="btn btn-danger" data-bet-side="NO" data-market-id="${market.id}">Bet No</button>
              <button class="btn btn-secondary" data-route-jump="friends">Invite Friends</button>
            </div>
          </article>
        `).join("") : `<div class="list-card"><h3>No matching markets</h3><p>Try a different search or filter to find a market.</p></div>`}
      </div>
    </section>
  `;
}

function renderMarketDetail() {
  const market = getSelectedMarket();
  const payout = calculatePayout({
    stake: state.betDraft.stake,
    withdrawableShare: state.betDraft.withdrawableShare,
    bonusShare: state.betDraft.bonusShare,
    market,
  });

  return `
    <section class="page ${state.route === "market-detail" ? "active" : ""}" data-page="market-detail">
      <div class="section-head">
        <div>
          <h3>${market.title}</h3>
          <p>${market.category} market with transparent funding and payout routing.</p>
        </div>
        <button class="btn btn-secondary" data-route-jump="markets">Back to Markets</button>
      </div>
      <div class="detail-grid">
        <div class="detail-stack">
          <div class="detail-panel">
            <h3>Market information</h3>
            <p>${market.description}</p>
            <div class="info-list">
              <div class="info-row"><span>Volume</span><strong>${money(market.volume)}</strong></div>
              <div class="info-row"><span>End date</span><strong>${market.endDate}</strong></div>
              <div class="info-row"><span>Current YES</span><strong>${formatPercent(market.yesPrice)}</strong></div>
              <div class="info-row"><span>Current NO</span><strong>${formatPercent(market.noPrice)}</strong></div>
            </div>
          </div>
          <div class="detail-panel">
            <h3>Recent activity</h3>
            <div class="activity-list">
              ${market.recentActivity.map((item) => `
                <div class="activity-item">
                  <div>
                    <strong>${item.user}</strong>
                    <div class="caption">${item.action}${item.amount ? ` &middot; ${money(item.amount)}` : ""}</div>
                  </div>
                  <div class="caption">${item.time}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
        <div class="detail-stack">
          <div class="detail-panel">
            <h3>Betting panel</h3>
            <p>Normal winnings stay tied to their original funding source. Social boosts always credit to bonus balance.</p>
            <div class="form-grid">
              <div class="field">
                <label class="label" for="stake-input">Stake</label>
                <input id="stake-input" type="number" min="1" step="1" value="${state.betDraft.stake}">
              </div>
              <div class="field">
                <label class="label" for="side-select">Side</label>
                <select id="side-select">
                  <option value="YES" ${state.betDraft.side === "YES" ? "selected" : ""}>Yes</option>
                  <option value="NO" ${state.betDraft.side === "NO" ? "selected" : ""}>No</option>
                </select>
              </div>
              <div class="field">
                <label class="label" for="withdrawable-input">Withdrawable used</label>
                <input id="withdrawable-input" type="number" min="0" step="1" value="${state.betDraft.withdrawableShare}">
              </div>
              <div class="field">
                <label class="label" for="bonus-input">Bonus used</label>
                <input id="bonus-input" type="number" min="0" step="1" value="${state.betDraft.bonusShare}">
              </div>
            </div>
            <div class="market-actions">
              <button class="btn btn-success" id="detail-bet-yes">Bet Yes</button>
              <button class="btn btn-danger" id="detail-bet-no">Bet No</button>
              <button class="btn btn-secondary" data-route-jump="friends">Invite Friends</button>
            </div>
            ${payout.note ? `<div class="note-banner" style="margin-top: 16px;">${payout.note}</div>` : ""}
            <div class="multiplier-box">
              <div class="label">Projected payout</div>
              <div class="multiplier-value">${money(payout.boostedPayout)}</div>
              <div class="caption">Normal payout ${money(payout.normalPayout)} &middot; Bonus social boost ${money(payout.socialBonus)}</div>
            </div>
            <div class="info-list">
              <div class="info-row"><span>Normalized stake</span><strong>${money(payout.totalStake)}</strong></div>
              <div class="info-row"><span>Withdrawable used</span><strong>${money(payout.withdrawableStake)}</strong></div>
              <div class="info-row"><span>Bonus used</span><strong>${money(payout.bonusStake)}</strong></div>
              <div class="info-row"><span>Withdrawable settlement</span><strong>${money(payout.totalWithdrawableReturn)}</strong></div>
              <div class="info-row"><span>Bonus settlement</span><strong>${money(payout.totalBonusReturn)}</strong></div>
            </div>
          </div>
          <div class="detail-panel">
            <h3>Friend multiplier</h3>
            <p>Boosts apply to the total normal payout, but the extra amount always lands in bonus balance.</p>
            <div class="multiplier-box">
              <div class="label">Current multiplier</div>
              <div class="multiplier-value">${getMultiplier(market).toFixed(2)}x</div>
              <div class="caption">${market.friendsBoosting} friends boosting this market &middot; Max ${state.adminConfig.maxMultiplier.toFixed(2)}x</div>
            </div>
            <div class="info-list">
              ${market.friendGroup.map((friend) => `
                <div class="info-row"><span>${friend}</span><strong>Boosting</strong></div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderFriends() {
  const selectedMarket = getSelectedMarket();
  const boostSlotsRemaining = Math.max(0, state.adminConfig.maxGroupSize - selectedMarket.friendGroup.length);
  const boostRows = state.friends.list.map((friend) => {
    const boostName = getFriendBoostName(friend);
    const isBoosting = selectedMarket.friendGroup.includes(boostName);
    const disabled = !isBoosting && boostSlotsRemaining <= 0 ? "disabled" : "";

    return `
      <div class="friend-item">
        <div>
          <strong>${friend.name}</strong>
          <div class="caption">${friend.username} &middot; ${isBoosting ? "Currently boosting" : `${friend.boostCount} shared boosts`}</div>
        </div>
        <button class="btn ${isBoosting ? "btn-ghost" : "btn-secondary"}" data-toggle-boost="${friend.username}" ${disabled}>${isBoosting ? "Remove Boost" : "Add Boost"}</button>
      </div>
    `;
  }).join("");

  return `
    <section class="page ${state.route === "friends" ? "active" : ""}" data-page="friends">
      <div class="section-head">
        <div>
          <h3>Friends</h3>
          <p>Add people, manage requests, and keep social boost relationships easy to understand.</p>
        </div>
      </div>
      <div class="friends-grid">
        <div class="list-card">
          <h3>Add friends</h3>
          <p>Search by username or invite directly.</p>
          <div class="toolbar">
            <div class="field"><input id="friend-invite-input" type="text" placeholder="Search @username" value="${state.friendInviteDraft}"></div>
            <button class="btn btn-primary" id="send-friend-invite">Send Invite</button>
          </div>
          <div class="note-banner">Future anti-abuse checks can inspect suspicious reciprocal boosting, shared-device signals, and repeated invite loops.</div>
        </div>
        <div class="list-card">
          <h3>Boost selected market</h3>
          <p>${selectedMarket.title}</p>
          <div class="info-list">
            <div class="info-row"><span>Current multiplier</span><strong>${getMultiplier(selectedMarket).toFixed(2)}x</strong></div>
            <div class="info-row"><span>Boost group</span><strong>${selectedMarket.friendGroup.length} / ${state.adminConfig.maxGroupSize}</strong></div>
            <div class="info-row"><span>Slots remaining</span><strong>${boostSlotsRemaining}</strong></div>
          </div>
          <div class="friend-list">
            ${boostRows || `<div class="empty-note">Accept a friend request to add boosters.</div>`}
          </div>
        </div>
        <div class="list-card">
          <h3>Pending requests</h3>
          <div class="request-list">
            ${state.friends.pending.length ? state.friends.pending.map((request) => `
              <div class="request-item">
                <div>
                  <strong>${request.name}</strong>
                  <div class="caption">${request.username} &middot; ${request.direction}</div>
                </div>
                <div class="inline-actions">
                  ${request.direction === "incoming" ? `
                    <button class="btn btn-secondary" data-friend-request="${request.username}" data-request-action="accept">Accept</button>
                    <button class="btn btn-ghost" data-friend-request="${request.username}" data-request-action="decline">Decline</button>
                  ` : `
                    <button class="btn btn-ghost" data-friend-request="${request.username}" data-request-action="cancel">Cancel</button>
                  `}
                </div>
              </div>
            `).join("") : `<div class="empty-note">No pending friend requests.</div>`}
          </div>
        </div>
        <div class="list-card">
          <h3>Friends list</h3>
          <div class="friend-list">
            ${state.friends.list.map((friend) => `
              <div class="friend-item">
                <div>
                  <strong>${friend.name}</strong>
                  <div class="caption">${friend.username} &middot; ${friend.boostCount} shared boosts</div>
                </div>
                <span class="pill">${friend.status}</span>
              </div>
            `).join("") || `<div class="empty-note">No friends yet.</div>`}
          </div>
        </div>
        <div class="list-card">
          <h3>Social boost rules</h3>
          <div class="info-list">
            <div class="info-row"><span>Max group size</span><strong>${state.adminConfig.maxGroupSize}</strong></div>
            <div class="info-row"><span>Multiplier per friend</span><strong>${(state.adminConfig.multiplierPerFriend * 100).toFixed(0)}%</strong></div>
            <div class="info-row"><span>Max multiplier</span><strong>${state.adminConfig.maxMultiplier.toFixed(2)}x</strong></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderPortfolio() {
  const ledgerEntries = getLedgerEntries();

  return `
    <section class="page ${state.route === "portfolio" ? "active" : ""}" data-page="portfolio">
      <div class="section-head">
        <div>
          <h3>Portfolio</h3>
          <p>Open bets, settled history, and separate play-money balances that mirror a real-money architecture.</p>
        </div>
      </div>
      <div class="portfolio-grid">
        <div class="list-card">
          <h3>Balances</h3>
          <div class="portfolio-balance">
            <div class="balance-box">
              <span class="label">Withdrawable balance</span>
              <strong>${money(state.currentUser.withdrawable_balance)}</strong>
              <span class="caption">Comes from deposits and normal winnings tied to withdrawable funds.</span>
            </div>
            <div class="balance-box">
              <span class="label">Bonus balance</span>
              <strong>${money(state.currentUser.bonus_balance)}</strong>
              <span class="caption">Comes from social boosts, promotions, referrals, and bonus-funded winnings.</span>
            </div>
            <div class="balance-box">
              <span class="label">Play-credit balance</span>
              <strong>${money(state.currentUser.play_credit_balance)}</strong>
              <span class="caption">Displayed as a friendly total, but still backed by separate ledger currencies.</span>
            </div>
          </div>
          <div class="inline-actions">
            <button class="btn btn-secondary" id="demo-deposit-button">Add $25 Deposit</button>
            <button class="btn btn-ghost" id="demo-bonus-button">Grant $10 Bonus</button>
          </div>
        </div>
        <div class="list-card">
          <div class="row-between">
            <div>
              <h3>Ledger preview</h3>
              <p>${ledgerEntries.length} matching transactions</p>
            </div>
          </div>
          <div class="segmented-control" aria-label="Ledger filter">
            ${[
              ["all", "All"],
              ["withdrawable", "Withdrawable"],
              ["bonus", "Bonus"],
              ["social_boost", "Boosts"],
              ["admin_adjustment", "Admin"],
            ].map(([value, label]) => `
              <button class="${state.ledgerFilter === value ? "active" : ""}" data-ledger-filter="${value}">${label}</button>
            `).join("")}
          </div>
          <div class="ledger-list">
            ${ledgerEntries.length ? ledgerEntries.map((entry) => `
              <div class="ledger-row">
                <div>
                  <strong>${titleCase(entry.source)}</strong>
                  <div class="caption">${entry.currency_type} &middot; ${entry.timestamp.slice(0, 10)}</div>
                  <div class="caption">${entry.metadata}</div>
                </div>
                <strong class="ledger-amount ${entry.transaction_type}">${signedMoney(entry)}</strong>
              </div>
            `).join("") : `<div class="empty-note">No transactions match this filter.</div>`}
          </div>
        </div>
        <div class="list-card">
          <h3>Open bets</h3>
          <div class="bet-list">
            ${state.portfolio.openBets.map((bet) => `
              <div class="bet-row">
                <div>
                  <strong>${bet.market}</strong>
                  <div class="caption">${bet.side} &middot; ${money(bet.stake)} &middot; ${bet.funding}</div>
                </div>
                <span class="pill">${bet.status}</span>
              </div>
            `).join("")}
          </div>
        </div>
        <div class="list-card">
          <h3>Past bets</h3>
          <div class="bet-list">
            ${state.portfolio.pastBets.map((bet) => `
              <div class="bet-row">
                <div>
                  <strong>${bet.market}</strong>
                  <div class="caption">${bet.side} &middot; ${bet.settlement}</div>
                </div>
                <strong>${money(bet.payout + bet.boost)}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderCreateMarket() {
  return `
    <section class="page ${state.route === "create" ? "active" : ""}" data-page="create">
      <div class="section-head">
        <div>
          <h3>Create Market</h3>
          <p>Keep submissions simple. Admin review comes before a market goes live.</p>
        </div>
      </div>
      <div class="list-card">
        <div class="note-banner">Every new market submission requires admin approval before it appears in the live markets list.</div>
        <form id="create-market-form" class="form-grid">
          <div class="field">
            <label class="label" for="market-title">Market title</label>
            <input id="market-title" name="title" value="${state.createMarketDraft.title}" placeholder="Will Team X make the playoffs?">
          </div>
          <div class="field">
            <label class="label" for="market-category-create">Category</label>
            <select id="market-category-create" name="category">
              <option value="NBA" ${state.createMarketDraft.category === "NBA" ? "selected" : ""}>NBA</option>
              <option value="NFL" ${state.createMarketDraft.category === "NFL" ? "selected" : ""}>NFL</option>
              <option value="MLB" ${state.createMarketDraft.category === "MLB" ? "selected" : ""}>MLB</option>
              <option value="Soccer" ${state.createMarketDraft.category === "Soccer" ? "selected" : ""}>Soccer</option>
            </select>
          </div>
          <div class="field full">
            <label class="label" for="market-description">Description</label>
            <textarea id="market-description" name="description" placeholder="Describe the event, resolution rules, and timing.">${state.createMarketDraft.description}</textarea>
          </div>
          <div class="field">
            <label class="label" for="market-close-date">Close date</label>
            <input id="market-close-date" name="closeDate" type="date" value="${state.createMarketDraft.closeDate}">
          </div>
          <div class="field">
            <label class="label" for="market-admin-note">Admin approval</label>
            <input id="market-admin-note" value="Required before launch" disabled>
          </div>
          <div class="field full">
            <button class="btn btn-primary" type="submit">Submit for Review</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderProfile() {
  return `
    <section class="page ${state.route === "profile" ? "active" : ""}" data-page="profile">
      <div class="section-head">
        <div>
          <h3>Profile</h3>
          <p>Basic account details with enough structure to support future verification and risk tooling.</p>
        </div>
      </div>
      <div class="profile-grid">
        <div class="list-card">
          <h3>Account</h3>
          <div class="info-list">
            <div class="info-row"><span>Name</span><strong>${state.currentUser.name}</strong></div>
            <div class="info-row"><span>Username</span><strong>${state.currentUser.username}</strong></div>
            <div class="info-row"><span>Email</span><strong>${state.currentUser.email}</strong></div>
            <div class="info-row"><span>Role</span><strong>${state.currentUser.isAdmin ? "Admin" : "Member"}</strong></div>
          </div>
        </div>
        <div class="list-card">
          <h3>Balances</h3>
          <div class="info-list">
            <div class="info-row"><span>Withdrawable</span><strong>${money(state.currentUser.withdrawable_balance)}</strong></div>
            <div class="info-row"><span>Bonus</span><strong>${money(state.currentUser.bonus_balance)}</strong></div>
            <div class="info-row"><span>Play credit total</span><strong>${money(state.currentUser.play_credit_balance)}</strong></div>
          </div>
        </div>
        <div class="list-card">
          <h3>Settings</h3>
          <div class="settings-grid">
            <div class="info-row"><span>Bonus usage</span><strong>${titleCase(state.currentUser.settings.betBonusUsage)}</strong></div>
            <div class="info-row"><span>Bonus market eligibility</span><strong>${titleCase(state.currentUser.settings.bonusMarketEligibility)}</strong></div>
            <div class="info-row"><span>Phone verification</span><strong>${titleCase(state.currentUser.settings.phoneVerificationStatus)}</strong></div>
            <div class="info-row"><span>Risk status</span><strong>${titleCase(state.currentUser.settings.riskStatus)}</strong></div>
          </div>
        </div>
        <div class="list-card">
          <h3>Future anti-abuse placeholders</h3>
          <div class="info-list">
            <div class="info-row"><span>Identity signals</span><strong>Phone, email, government ID</strong></div>
            <div class="info-row"><span>Payment signals</span><strong>Card, bank, payment-method uniqueness</strong></div>
            <div class="info-row"><span>Behavioral signals</span><strong>Device, IP, household, friend-graph risk scoring</strong></div>
            <div class="info-row"><span>Manual controls</span><strong>Freeze account, claw back bonus, review queue</strong></div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAdmin() {
  if (!state.currentUser.isAdmin) {
    return `
      <section class="page ${state.route === "admin" ? "active" : ""}" data-page="admin">
        <div class="list-card">
          <h3>Admin dashboard</h3>
          <p>This view is hidden unless admin mode is enabled.</p>
        </div>
      </section>
    `;
  }

  const riskUsers = state.users.filter((user) => user.risk_status !== "clear" || user.risk_score >= 40);
  const totalBonusBalances = state.users.reduce((sum, user) => sum + user.bonus_balance, 0);
  const frozenUsers = state.users.filter((user) => user.frozen).length;

  return `
    <section class="page ${state.route === "admin" ? "active" : ""}" data-page="admin">
      <div class="section-head">
        <div>
          <h3>Admin Dashboard</h3>
          <p>Separate operational view for market approvals, resolution, and bonus liability controls.</p>
        </div>
      </div>
      <div class="note-banner admin-banner">The MVP keeps anti-fraud checks as placeholders, but the admin model already reserves room for freezes, reversals, and risk review workflows.</div>
      <div class="admin-summary">
        <div>
          <span class="label">Bonus balances</span>
          <strong>${money(totalBonusBalances)}</strong>
        </div>
        <div>
          <span class="label">Review queue</span>
          <strong>${riskUsers.length}</strong>
        </div>
        <div>
          <span class="label">Frozen accounts</span>
          <strong>${frozenUsers}</strong>
        </div>
        <div>
          <span class="label">Company liability</span>
          <strong>${money(state.adminConfig.bonusLiability)}</strong>
        </div>
      </div>
      <div class="admin-grid">
        <div class="table-card">
          <h3>Pending markets</h3>
          <table class="data-table">
            <thead>
              <tr><th>Market</th><th>Submitted by</th><th>Date</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.pendingMarkets.map((market) => `
                <tr>
                  <td data-label="Market">${market.title}</td>
                  <td data-label="Submitted by">${market.submittedBy}</td>
                  <td data-label="Date">${market.createdAt}</td>
                  <td data-label="Actions">
                    <div class="inline-actions">
                      <button class="btn btn-secondary" data-approve-market="${market.id}">Approve</button>
                      <button class="btn btn-ghost" data-reject-market="${market.id}">Reject</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="table-card">
          <h3>Active markets</h3>
          <table class="data-table">
            <thead>
              <tr><th>Market</th><th>Volume</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              ${state.activeMarkets.map((market) => `
                <tr>
                  <td data-label="Market">${market.title}</td>
                  <td data-label="Volume">${money(market.volume)}</td>
                  <td data-label="Status">${market.status}</td>
                  <td data-label="Actions">
                    <div class="inline-actions">
                      <button class="btn btn-secondary" data-resolve-market="${market.id}" data-resolve-result="YES">Resolve Yes</button>
                      <button class="btn btn-ghost" data-resolve-market="${market.id}" data-resolve-result="NO">Resolve No</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="table-card">
          <h3>Social boost controls</h3>
          <div class="form-grid">
            <div class="field">
              <label class="label" for="boost-enabled">Social boosts</label>
              <select id="boost-enabled" data-admin-field="socialBoostsEnabled">
                <option value="true" ${state.adminConfig.socialBoostsEnabled ? "selected" : ""}>Enabled</option>
                <option value="false" ${!state.adminConfig.socialBoostsEnabled ? "selected" : ""}>Disabled</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="max-group-size">Max group size</label>
              <input id="max-group-size" data-admin-field="maxGroupSize" type="number" min="1" value="${state.adminConfig.maxGroupSize}">
            </div>
            <div class="field">
              <label class="label" for="per-friend">Multiplier per friend</label>
              <input id="per-friend" data-admin-field="multiplierPerFriend" type="number" min="0" max="1" step="0.01" value="${state.adminConfig.multiplierPerFriend}">
            </div>
            <div class="field">
              <label class="label" for="max-multiplier">Max multiplier</label>
              <input id="max-multiplier" data-admin-field="maxMultiplier" type="number" min="1" max="5" step="0.01" value="${state.adminConfig.maxMultiplier}">
            </div>
            <div class="field">
              <label class="label" for="bonus-funds-eligibility">Bonus fund markets</label>
              <select id="bonus-funds-eligibility" data-admin-field="bonusFundsEligibility">
                <option value="eligible_only" ${state.adminConfig.bonusFundsEligibility === "eligible_only" ? "selected" : ""}>Eligible markets only</option>
                <option value="all_markets" ${state.adminConfig.bonusFundsEligibility === "all_markets" ? "selected" : ""}>All markets</option>
              </select>
            </div>
            <div class="field">
              <label class="label" for="bonus-usage-mode">Bonus usage mode</label>
              <select id="bonus-usage-mode" data-admin-field="bonusUsageMode">
                <option value="partial" ${state.adminConfig.bonusUsageMode === "partial" ? "selected" : ""}>Partial use allowed</option>
                <option value="full" ${state.adminConfig.bonusUsageMode === "full" ? "selected" : ""}>Bonus first</option>
                <option value="none" ${state.adminConfig.bonusUsageMode === "none" ? "selected" : ""}>Disabled</option>
              </select>
            </div>
          </div>
        </div>
        <div class="table-card">
          <h3>Bonus liability overview</h3>
          <div class="form-grid">
            <div class="field">
              <label class="label" for="max-bonus-user">Max bonus payout per user</label>
              <input id="max-bonus-user" data-admin-field="maxBonusPayoutPerUser" type="number" min="0" step="1" value="${state.adminConfig.maxBonusPayoutPerUser}">
            </div>
            <div class="field">
              <label class="label" for="max-bonus-market">Max bonus payout per market</label>
              <input id="max-bonus-market" data-admin-field="maxBonusPayoutPerMarket" type="number" min="0" step="1" value="${state.adminConfig.maxBonusPayoutPerMarket}">
            </div>
            <div class="field">
              <label class="label" for="daily-bonus-limit">Daily bonus payout limit</label>
              <input id="daily-bonus-limit" data-admin-field="dailyBonusPayoutLimit" type="number" min="0" step="1" value="${state.adminConfig.dailyBonusPayoutLimit}">
            </div>
            <div class="field">
              <label class="label" for="bonus-liability">Company bonus liability</label>
              <input id="bonus-liability" data-admin-field="bonusLiability" type="number" min="0" step="1" value="${state.adminConfig.bonusLiability}">
            </div>
          </div>
        </div>
        <div class="table-card">
          <h3>Resolve markets</h3>
          <p>Settlement should route normal winnings by original funding ratio and social boosts to bonus balance only.</p>
          <div class="admin-list">
            <div class="admin-row"><span>Ledger split rule</span><strong>Proportional by stake source</strong></div>
            <div class="admin-row"><span>Bonus-funded winnings</span><strong>Return to bonus balance</strong></div>
            <div class="admin-row"><span>Mixed-fund winnings</span><strong>Split by original ratios</strong></div>
          </div>
        </div>
        <div class="table-card">
          <h3>Risk review queue</h3>
          <p>IP and household signals are treated as context, not automatic bans.</p>
          <div class="risk-list">
            ${riskUsers.length ? riskUsers.map((user) => `
              <div class="risk-item">
                <div class="row-between">
                  <div>
                    <strong>${user.name}</strong>
                    <div class="caption">${getRiskLabel(user.risk_score)} risk &middot; Score ${user.risk_score}</div>
                  </div>
                  <span class="status-badge ${user.frozen ? "frozen" : user.risk_status}">${titleCase(user.risk_status)}</span>
                </div>
                <div class="risk-signals">
                  ${user.risk_signals.map((signal) => `<span>${signal}</span>`).join("")}
                </div>
                <div class="inline-actions">
                  <button class="btn btn-secondary" data-freeze-user="${user.id}">${user.frozen ? "Unfreeze" : "Freeze"}</button>
                  <button class="btn btn-ghost" data-clear-risk="${user.id}">Clear Review</button>
                  <button class="btn btn-ghost" data-remove-bonus="${user.id}">Remove $10 Bonus</button>
                </div>
              </div>
            `).join("") : `<div class="empty-note">No users are currently flagged for review.</div>`}
          </div>
        </div>
        <div class="table-card">
          <h3>User and ledger overview</h3>
          <div class="admin-list">
            <div class="admin-row"><span>Users needing review</span><strong>${riskUsers.length}</strong></div>
            <div class="admin-row"><span>Frozen accounts</span><strong>${frozenUsers}</strong></div>
            <div class="admin-row"><span>Latest ledger source types</span><strong>deposit, bet_placed, market_payout, social_boost</strong></div>
          </div>
          <table class="data-table">
            <thead>
              <tr><th>User</th><th>Withdrawable</th><th>Bonus</th><th>Risk</th></tr>
            </thead>
            <tbody>
              ${state.users.map((user) => `
                <tr>
                  <td data-label="User">${user.name}</td>
                  <td data-label="Withdrawable">${money(user.withdrawable_balance)}</td>
                  <td data-label="Bonus">${money(user.bonus_balance)}</td>
                  <td data-label="Risk">${titleCase(user.risk_status)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="table-card">
          <h3>Resolved markets</h3>
          <table class="data-table">
            <thead>
              <tr><th>Market</th><th>Result</th><th>Date</th></tr>
            </thead>
            <tbody>
              ${state.resolvedMarkets.map((market) => `
                <tr>
                  <td data-label="Market">${market.title}</td>
                  <td data-label="Result">${market.result}</td>
                  <td data-label="Date">${market.resolvedAt}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="table-card">
          <h3>Demo controls</h3>
          <p>Useful while iterating on the client-side MVP.</p>
          <div class="inline-actions">
            <button class="btn btn-secondary" id="admin-grant-bonus">Grant $10 bonus</button>
            <button class="btn btn-secondary" id="admin-add-deposit">Add $25 deposit</button>
            <button class="btn btn-secondary" id="reset-demo-state">Reset demo state</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderApp() {
  return `
    <div class="shell">
      ${renderNav()}
      <main class="page-wrap">
        ${renderFlash()}
        ${renderLanding()}
        ${renderMarkets()}
        ${renderMarketDetail()}
        ${renderFriends()}
        ${renderPortfolio()}
        ${renderCreateMarket()}
        ${renderProfile()}
        ${renderAdmin()}
      </main>
      <footer class="footer-wrap">
        <p>Agora MVP prototype for a responsive web app with separate withdrawable and bonus ledger balances.</p>
      </footer>
    </div>
  `;
}

function bindEvents() {
  document.getElementById("dismiss-flash")?.addEventListener("click", dismissFlashMessage);
  document.getElementById("mobile-menu-button")?.addEventListener("click", toggleMobileNav);

  document.querySelectorAll("[data-route]").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      const route = event.currentTarget.getAttribute("data-route");
      setRoute(route);
    });
  });

  document.querySelectorAll("[data-route-jump]").forEach((element) => {
    element.addEventListener("click", () => {
      const route = element.getAttribute("data-route-jump");
      setRoute(route);
    });
  });

  document.getElementById("admin-toggle")?.addEventListener("change", (event) => {
    toggleAdminMode(event.currentTarget.checked);
  });

  document.getElementById("market-search")?.addEventListener("input", (event) => {
    state.filters.query = event.currentTarget.value;
    render();
  });

  document.getElementById("market-category")?.addEventListener("change", (event) => {
    state.filters.category = event.currentTarget.value;
    render();
  });

  document.querySelectorAll("[data-market-detail]").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedMarketId = element.getAttribute("data-market-detail");
      setRoute("market-detail");
    });
  });

  document.querySelectorAll("[data-bet-side]").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedMarketId = element.getAttribute("data-market-id");
      state.betDraft.side = element.getAttribute("data-bet-side");
      setFlashMessage(`Review your ${state.betDraft.side} bet before placing it.`);
      setRoute("market-detail");
    });
  });

  document.getElementById("stake-input")?.addEventListener("input", (event) => {
    updateBetDraft("stake", event.currentTarget.value);
  });

  document.getElementById("withdrawable-input")?.addEventListener("input", (event) => {
    updateBetDraft("withdrawableShare", event.currentTarget.value);
  });

  document.getElementById("bonus-input")?.addEventListener("input", (event) => {
    updateBetDraft("bonusShare", event.currentTarget.value);
  });

  document.getElementById("side-select")?.addEventListener("change", (event) => {
    state.betDraft.side = event.currentTarget.value;
  });

  document.getElementById("detail-bet-yes")?.addEventListener("click", () => placeBet("YES"));
  document.getElementById("detail-bet-no")?.addEventListener("click", () => placeBet("NO"));

  document.getElementById("create-market-form")?.addEventListener("submit", createMarket);

  document.getElementById("market-title")?.addEventListener("input", (event) => {
    state.createMarketDraft.title = event.currentTarget.value;
  });
  document.getElementById("market-category-create")?.addEventListener("change", (event) => {
    state.createMarketDraft.category = event.currentTarget.value;
  });
  document.getElementById("market-description")?.addEventListener("input", (event) => {
    state.createMarketDraft.description = event.currentTarget.value;
  });
  document.getElementById("market-close-date")?.addEventListener("input", (event) => {
    state.createMarketDraft.closeDate = event.currentTarget.value;
  });

  document.getElementById("friend-invite-input")?.addEventListener("input", (event) => {
    state.friendInviteDraft = event.currentTarget.value;
  });

  document.getElementById("send-friend-invite")?.addEventListener("click", sendFriendInvite);

  document.querySelectorAll("[data-friend-request]").forEach((element) => {
    element.addEventListener("click", () => {
      handleFriendRequest(
        element.getAttribute("data-friend-request"),
        element.getAttribute("data-request-action"),
      );
    });
  });

  document.querySelectorAll("[data-toggle-boost]").forEach((element) => {
    element.addEventListener("click", () => toggleFriendBoost(element.getAttribute("data-toggle-boost")));
  });

  document.querySelectorAll("[data-admin-field]").forEach((element) => {
    element.addEventListener("change", (event) => {
      const field = event.currentTarget.getAttribute("data-admin-field");
      const rawValue = event.currentTarget.value;
      const normalizedValue =
        rawValue === "true" ? true :
        rawValue === "false" ? false :
        rawValue;
      updateAdminConfig(field, normalizedValue);
    });
  });

  document.querySelectorAll("[data-approve-market]").forEach((element) => {
    element.addEventListener("click", () => approveMarket(element.getAttribute("data-approve-market")));
  });

  document.querySelectorAll("[data-reject-market]").forEach((element) => {
    element.addEventListener("click", () => rejectMarket(element.getAttribute("data-reject-market")));
  });

  document.querySelectorAll("[data-resolve-market]").forEach((element) => {
    element.addEventListener("click", () => {
      resolveActiveMarket(
        element.getAttribute("data-resolve-market"),
        element.getAttribute("data-resolve-result"),
      );
    });
  });

  document.querySelectorAll("[data-ledger-filter]").forEach((element) => {
    element.addEventListener("click", () => setLedgerFilter(element.getAttribute("data-ledger-filter")));
  });

  document.querySelectorAll("[data-freeze-user]").forEach((element) => {
    element.addEventListener("click", () => freezeUser(element.getAttribute("data-freeze-user")));
  });

  document.querySelectorAll("[data-clear-risk]").forEach((element) => {
    element.addEventListener("click", () => clearRiskReview(element.getAttribute("data-clear-risk")));
  });

  document.querySelectorAll("[data-remove-bonus]").forEach((element) => {
    element.addEventListener("click", () => removeUserBonus(element.getAttribute("data-remove-bonus")));
  });

  document.getElementById("reset-demo-state")?.addEventListener("click", resetDemoState);
  document.getElementById("demo-deposit-button")?.addEventListener("click", addDemoDeposit);
  document.getElementById("demo-bonus-button")?.addEventListener("click", grantDemoBonus);
  document.getElementById("admin-grant-bonus")?.addEventListener("click", grantDemoBonus);
  document.getElementById("admin-add-deposit")?.addEventListener("click", addDemoDeposit);
}

function render() {
  document.getElementById("app").innerHTML = renderApp();
  saveState();
  bindEvents();
}

window.addEventListener("hashchange", () => {
  const nextRoute = window.location.hash.replace("#", "");
  if (nextRoute) {
    state.route = nextRoute;
    render();
  }
});

const initialHash = window.location.hash.replace("#", "");
if (initialHash) {
  state.route = initialHash;
}

render();
