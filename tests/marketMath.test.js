import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminAdjustmentEntry,
  createBetLedgerEntries,
  createFundsCreditEntry,
  createRefundLedgerEntries,
  createSettlementLedgerEntries,
} from "../lib/accounting.js";
import { calculatePayout, getMultiplier, normalizeFunding } from "../lib/marketMath.js";
import {
  hasValidationErrors,
  validateBetDraft,
  validateCreateMarketDraft,
} from "../lib/validation.js";
import {
  buildLedgerExportRows,
  buildRiskReviewExportRows,
  ledgerExportColumns,
  riskReviewExportColumns,
  toCsv,
} from "../lib/exporters.js";
import {
  getCategoryCoverageSummary,
  getMarketCategory,
  getMarketCategoryOptions,
  getResolutionTemplate,
} from "../lib/marketTaxonomy.js";
import { getLedgerView } from "../lib/ledgerViews.js";
import {
  getLinkedLiveGame,
  getLiveGameClock,
  getMarketAlgorithmSnapshot,
  getMarketPipelineSummary,
  rankMarketsBySignal,
} from "../lib/marketAlgorithms.js";
import { applyRiskSignalsToUser, getBoostRiskSignals } from "../lib/riskEngine.js";
import { getSourceAdapter, validateSourceAdapterConfig } from "../lib/sourceAdapters.js";
import { getSessionFromRequest, requireAdmin } from "../lib/server/auth.js";

const baseAdminConfig = {
  socialBoostsEnabled: true,
  maxGroupSize: 5,
  multiplierPerFriend: 0.05,
  maxMultiplier: 1.2,
  bonusFundsEligibility: "eligible_only",
  bonusUsageMode: "partial",
  maxBonusStakePercent: 50,
  maxBonusPayoutPerUser: 250,
  maxBonusPayoutPerMarket: 800,
  dailyBonusPayoutLimit: 2500,
};

const boostedMarket = {
  id: "market_1",
  title: "Will the Knicks make the 2026 Eastern Conference Finals?",
  eligibleForBonus: true,
  friendsBoosting: 4,
};

test("social multiplier respects friend count and admin cap", () => {
  assert.equal(getMultiplier(boostedMarket, baseAdminConfig), 1.2);
  assert.equal(
    getMultiplier({ ...boostedMarket, friendsBoosting: 10 }, baseAdminConfig),
    1.2,
  );
  assert.equal(
    getMultiplier(boostedMarket, { ...baseAdminConfig, socialBoostsEnabled: false }),
    1,
  );
});

test("mixed-funded payout splits normal winnings and sends boost to bonus", () => {
  const payout = calculatePayout({
    stake: 10,
    withdrawableShare: 6,
    bonusShare: 4,
    market: boostedMarket,
    adminConfig: baseAdminConfig,
  });

  assert.equal(payout.totalStake, 10);
  assert.equal(payout.normalPayout, 20);
  assert.equal(payout.socialBonus, 4);
  assert.equal(payout.totalWithdrawableReturn, 12);
  assert.equal(payout.bonusPayoutFromNormal, 8);
  assert.equal(payout.totalBonusReturn, 12);
});

test("bonus balance is excluded when market is not bonus eligible", () => {
  const funding = normalizeFunding({
    stake: 10,
    withdrawableShare: 6,
    bonusShare: 4,
    market: { ...boostedMarket, eligibleForBonus: false },
    adminConfig: baseAdminConfig,
  });

  assert.equal(funding.totalStake, 6);
  assert.equal(funding.withdrawableStake, 6);
  assert.equal(funding.bonusStake, 0);
  assert.match(funding.note, /disabled on this market/);
});

test("bonus-first policy normalizes the full stake to bonus funds", () => {
  const funding = normalizeFunding({
    stake: 10,
    withdrawableShare: 6,
    bonusShare: 4,
    market: boostedMarket,
    adminConfig: { ...baseAdminConfig, bonusUsageMode: "full" },
  });

  assert.equal(funding.totalStake, 10);
  assert.equal(funding.withdrawableStake, 0);
  assert.equal(funding.bonusStake, 10);
});

test("partial bonus policy caps bonus stake percentage", () => {
  const funding = normalizeFunding({
    stake: 10,
    withdrawableShare: 2,
    bonusShare: 8,
    market: boostedMarket,
    adminConfig: { ...baseAdminConfig, maxBonusStakePercent: 40 },
  });

  assert.equal(funding.totalStake, 6);
  assert.equal(funding.withdrawableStake, 2);
  assert.equal(funding.bonusStake, 4);
  assert.match(funding.note, /capped at 40%/);
});

test("social bonus payout respects admin and market caps", () => {
  const payout = calculatePayout({
    stake: 100,
    withdrawableShare: 100,
    bonusShare: 0,
    market: { ...boostedMarket, bonusPayoutCap: 12 },
    adminConfig: {
      ...baseAdminConfig,
      multiplierPerFriend: 0.2,
      maxMultiplier: 2,
      maxBonusPayoutPerUser: 30,
      maxBonusPayoutPerMarket: 20,
      dailyBonusPayoutLimit: 18,
    },
  });

  assert.equal(payout.uncappedSocialBonus, 160);
  assert.equal(payout.socialBonus, 12);
  assert.equal(payout.boostedPayout, 212);
});

test("bet placement ledger entries debit each funding currency", () => {
  const entries = createBetLedgerEntries({
    userId: "user_1",
    marketId: "market_1",
    betId: "bet_1",
    side: "YES",
    marketTitle: boostedMarket.title,
    withdrawableStake: 6,
    bonusStake: 4,
    timestamp: "2026-04-27T10:00:00Z",
  });

  assert.deepEqual(
    entries.map((entry) => [entry.transaction_type, entry.amount, entry.currency_type, entry.source]),
    [
      ["debit", 6, "withdrawable", "bet_placed"],
      ["debit", 4, "bonus", "bet_placed"],
    ],
  );
  assert.equal(entries[0].timestamp, "2026-04-27T10:00:00Z");
});

test("settlement ledger entries route normal and boosted winnings separately", () => {
  const settlement = calculatePayout({
    stake: 10,
    withdrawableShare: 6,
    bonusShare: 4,
    market: boostedMarket,
    adminConfig: baseAdminConfig,
  });
  const entries = createSettlementLedgerEntries({
    userId: "user_1",
    market: boostedMarket,
    bet: {
      id: "bet_1",
      market: boostedMarket.title,
      side: "YES",
    },
    settlement,
    timestamp: "2026-04-27T11:00:00Z",
  });

  assert.deepEqual(
    entries.map((entry) => [entry.transaction_type, entry.amount, entry.currency_type, entry.source]),
    [
      ["credit", 12, "withdrawable", "market_payout"],
      ["credit", 8, "bonus", "market_payout"],
      ["credit", 4, "bonus", "social_boost"],
    ],
  );
});

test("refund ledger entries return original stakes by funding currency", () => {
  const entries = createRefundLedgerEntries({
    userId: "user_1",
    market: boostedMarket,
    bet: {
      id: "bet_1",
      market: boostedMarket.title,
      withdrawableStake: 6,
      bonusStake: 4,
    },
    timestamp: "2026-04-27T11:05:00Z",
  });

  assert.deepEqual(
    entries.map((entry) => [entry.transaction_type, entry.amount, entry.currency_type, entry.source]),
    [
      ["credit", 6, "withdrawable", "refund"],
      ["credit", 4, "bonus", "refund"],
    ],
  );
});

test("deposit and admin adjustment entries preserve accounting source", () => {
  const deposit = createFundsCreditEntry({
    userId: "user_1",
    amount: 25,
    currencyType: "withdrawable",
    source: "deposit",
    metadata: "Demo play-money deposit",
    timestamp: "2026-04-27T12:00:00Z",
  });
  const removal = createAdminAdjustmentEntry({
    userId: "user_1",
    amount: 10,
    transactionType: "debit",
    metadata: "Promotional bonus removed during manual review",
    timestamp: "2026-04-27T12:05:00Z",
  });

  assert.equal(deposit.transaction_type, "credit");
  assert.equal(deposit.currency_type, "withdrawable");
  assert.equal(deposit.source, "deposit");
  assert.equal(removal.transaction_type, "debit");
  assert.equal(removal.currency_type, "bonus");
  assert.equal(removal.source, "admin_adjustment");
});

test("create market validation requires useful content and a future close date", () => {
  const errors = validateCreateMarketDraft(
    {
      title: "Short",
      description: "Too thin",
      closeDate: "2026-04-27",
      sourceUrl: "ftp://example.com/source",
    },
    "2026-04-27",
  );

  assert.equal(errors.title.includes("10 characters"), true);
  assert.equal(errors.description.includes("more detail"), true);
  assert.equal(errors.closeDate, "Choose a future close date.");
  assert.equal(errors.sourceUrl, "Use a public http or https source URL.");
  assert.equal(hasValidationErrors(errors), true);

  assert.deepEqual(
    validateCreateMarketDraft(
      {
        title: "Will the Giants make the playoffs?",
        description: "Resolves yes if the Giants officially qualify for the postseason.",
        closeDate: "2026-09-01",
        sourceUrl: "https://www.nfl.com/standings/",
      },
      "2026-04-27",
    ),
    {},
  );
});

test("bet validation blocks zero stake and balances above available funds", () => {
  const errors = validateBetDraft({
    payout: {
      totalStake: 0,
      withdrawableStake: 200,
      bonusStake: 80,
    },
    currentUser: {
      withdrawable_balance: 100,
      bonus_balance: 20,
    },
  });

  assert.equal(errors.stake, "Enter a stake and funding mix above zero.");
  assert.equal(errors.withdrawableShare, "Withdrawable amount exceeds your balance.");
  assert.equal(errors.bonusShare, "Bonus amount exceeds your balance.");
});

test("CSV exporter quotes commas, quotes, and newlines", () => {
  const csv = toCsv(
    [
      {
        name: 'Maya "Ace"',
        metadata: "Line one\nLine two, with comma",
      },
    ],
    [
      { key: "name", label: "Name" },
      { key: "metadata", label: "Metadata" },
    ],
  );

  assert.equal(csv, 'Name,Metadata\n"Maya ""Ace""","Line one\nLine two, with comma"');
});

test("ledger and risk exports map operational fields", () => {
  const ledgerRows = buildLedgerExportRows([
    {
      timestamp: "2026-04-27T12:00:00Z",
      user_id: "user_1",
      market_id: null,
      bet_id: null,
      transaction_type: "credit",
      amount: 25,
      currency_type: "withdrawable",
      source: "deposit",
      metadata: "Demo deposit",
    },
  ]);
  const riskRows = buildRiskReviewExportRows([
    {
      id: "user_4",
      name: "Theo Nguyen",
      withdrawable_balance: 41,
      bonus_balance: 58,
      risk_status: "review",
      risk_score: 71,
      frozen: false,
      risk_signals: ["High bonus velocity", "Dense friend boosting"],
    },
  ]);

  assert.equal(toCsv(ledgerRows, ledgerExportColumns).startsWith("Timestamp,User ID"), true);
  assert.equal(ledgerRows[0].market_id, "");
  assert.equal(riskRows[0].risk_signals, "High bonus velocity; Dense friend boosting");
  assert.equal(toCsv(riskRows, riskReviewExportColumns).includes("Theo Nguyen"), true);
});

test("ledger view filters, sorts, and paginates audit rows", () => {
  const entries = [
    {
      timestamp: "2026-04-27T12:00:00Z",
      user_id: "user_1",
      amount: 25,
      currency_type: "withdrawable",
      source: "deposit",
    },
    {
      timestamp: "2026-04-27T13:00:00Z",
      user_id: "user_1",
      amount: 4,
      currency_type: "bonus",
      source: "social_boost",
    },
    {
      timestamp: "2026-04-27T14:00:00Z",
      user_id: "user_2",
      amount: 10,
      currency_type: "bonus",
      source: "admin_adjustment",
    },
  ];

  const bonusView = getLedgerView({
    entries,
    filter: "bonus",
    sort: "amount_desc",
    page: 1,
    pageSize: 1,
  });

  assert.equal(bonusView.totalEntries, 2);
  assert.equal(bonusView.totalPages, 2);
  assert.equal(bonusView.entries[0].amount, 10);

  const userView = getLedgerView({
    entries,
    userId: "user_1",
    sort: "oldest",
    pageSize: 5,
  });

  assert.equal(userView.totalEntries, 2);
  assert.equal(userView.entries[0].source, "deposit");
});

test("risk engine flags repeated and dense friend boosts", () => {
  const friend = { name: "Maya Patel", username: "@maya", boostCount: 6 };
  const market = { friendGroup: ["Maya", "Jordan", "Theo", "Ava"] };
  const signals = getBoostRiskSignals({
    friend,
    market,
    markets: [
      { friendGroup: ["Maya"] },
      { friendGroup: ["Maya", "Theo"] },
      { friendGroup: ["Maya", "Jordan"] },
    ],
    adminConfig: { maxGroupSize: 5 },
  });

  assert.equal(signals.includes("High repeat boost activity"), true);
  assert.equal(signals.includes("Repeated booster across markets"), true);
  assert.equal(signals.includes("Dense friend boosting cluster"), true);

  const user = applyRiskSignalsToUser(
    { risk_status: "clear", risk_score: 12, risk_signals: [] },
    signals,
  );

  assert.equal(user.risk_status, "monitor");
  assert.equal(user.risk_signals.length, signals.length);
});

test("market taxonomy covers core expansion categories", () => {
  const options = getMarketCategoryOptions();
  assert.equal(options.includes("Sports"), true);
  assert.equal(options.includes("Politics"), true);
  assert.equal(options.includes("Weather"), true);
  assert.equal(options.includes("Finance"), true);

  const weather = getMarketCategory("Weather");
  assert.equal(weather.resolutionNeeds.includes("Station ID"), true);
  assert.equal(getResolutionTemplate("Weather").template.includes("named station"), true);
  assert.equal(getCategoryCoverageSummary().some((item) => item.label === "Politics"), true);
});

test("source adapters define required settlement fields by category", () => {
  const sports = getSourceAdapter("Sports");
  assert.equal(sports.providerType, "official_league_or_paid_data_provider");
  assert.equal(sports.requiredFields.includes("officialResultsUrl"), true);

  const invalidWeather = validateSourceAdapterConfig("Weather", {
    stationId: "KLGA",
    metric: "daily_high_temperature",
  });
  assert.equal(invalidWeather.ok, false);
  assert.deepEqual(invalidWeather.missingFields, ["observationWindow", "sourceUrl"]);

  const validCrypto = validateSourceAdapterConfig("Crypto", {
    assetSymbol: "BTC",
    quoteCurrency: "USD",
    referenceVenue: "Coinbase",
    snapshotTime: "2026-07-31T20:00:00Z",
  });
  assert.equal(validCrypto.ok, true);
});

test("request auth helper recognizes dev admin shortcut header when enabled", async () => {
  const previousShortcut = process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT;
  process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT = "1";
  const userRequest = new Request("http://friendmarket.test/api/admin/config");
  const adminRequest = new Request("http://friendmarket.test/api/admin/config", {
    headers: {
      "x-friendmarket-role": "admin",
    },
  });

  assert.equal((await getSessionFromRequest(userRequest)).isAdmin, false);
  assert.equal((await getSessionFromRequest(adminRequest)).userId, "user_1");

  const denied = await requireAdmin(userRequest);
  assert.equal(denied.response.status, 403);
  assert.equal((await denied.response.json()).message, "Admin role is required for this action.");

  const allowed = await requireAdmin(adminRequest);
  assert.equal(allowed.response, null);
  assert.equal(allowed.session.role, "admin");
  if (previousShortcut === undefined) {
    delete process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT;
  } else {
    process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT = previousShortcut;
  }
});

test("default market seeds include expansion markets", async () => {
  const { defaultState } = await import("../lib/defaultState.js");
  const categories = new Set(defaultState.markets.map((market) => market.category));

  assert.equal(categories.has("Sports"), true);
  assert.equal(categories.has("Politics"), true);
  assert.equal(categories.has("Weather"), true);
  assert.equal(defaultState.markets.every((market) => market.resolutionTemplate), true);
  assert.equal(defaultState.markets.every((market) => market.closeTime), true);
  assert.equal(defaultState.markets.every((market) => market.resolutionRule), true);
  assert.equal(defaultState.markets.every((market) => market.evidenceLinks.some((source) => source.url)), true);
  assert.equal(defaultState.referrals.code, "ARUSH25");
  assert.equal(defaultState.fundingDrafts.depositAmount, 25);
  assert.equal(defaultState.createMarketDraft.sourceUrl, "");
});

test("market algorithms expose live tracking and signal summaries", async () => {
  const { defaultState } = await import("../lib/defaultState.js");
  const knicks = defaultState.markets.find((market) => market.id === "market_1");
  const snapshot = getMarketAlgorithmSnapshot(knicks, defaultState.liveGames);
  const summary = getMarketPipelineSummary(defaultState.markets, defaultState.liveGames);
  const linkedGame = getLinkedLiveGame(knicks, defaultState.liveGames);
  const ranked = rankMarketsBySignal(defaultState.markets, defaultState.liveGames);

  assert.equal(linkedGame.id, "game_knicks_celtics");
  assert.equal(getLiveGameClock(linkedGame), "Q3 · 6:42");
  assert.equal(snapshot.model, "Live sports tracker");
  assert.equal(snapshot.movementScore > 0, true);
  assert.equal(summary.liveLinked >= 3, true);
  assert.equal(summary.algorithmic >= 4, true);
  assert.equal(ranked[0].snapshot.movementScore >= ranked.at(-1).snapshot.movementScore, true);
});
