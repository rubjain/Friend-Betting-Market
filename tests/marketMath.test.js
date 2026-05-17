import assert from "node:assert/strict";
import test from "node:test";
import {
  createAdminAdjustmentEntry,
  createBetLedgerEntries,
  createFundsCreditEntry,
  createRefundLedgerEntries,
  createSettlementLedgerEntries,
} from "../lib/accounting.js";
import {
  calculateOrderPreview,
  calculatePayout,
  getMultiplier,
  normalizeFunding,
} from "../lib/marketMath.js";
import {
  hasValidationErrors,
  validateBetDraft,
  validateCreateMarketDraft,
} from "../lib/validation.js";
import {
  buildExportFilename,
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
import {
  applyRiskSignalsToUser,
  getBoostRiskSignals,
  getRiskBand,
  getRiskExplanation,
} from "../lib/riskEngine.js";
import { getSourceAdapter, validateSourceAdapterConfig } from "../lib/sourceAdapters.js";
import { buildAdminAuditWhere } from "../lib/server/adminDataService.js";
import { buildLedgerExportWhere } from "../lib/server/exportService.js";
import {
  getSessionFromRequest,
  requireAdmin,
  requireAdminPermission,
  requireAuthenticated,
} from "../lib/server/auth.js";
import { ADMIN_PERMISSIONS } from "../lib/server/adminPermissions.js";

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

test("order preview estimates contracts entry spread and pool fees", () => {
  const preview = calculateOrderPreview({
    stake: 25,
    side: "YES",
    market: {
      yesPrice: 0.58,
      noPrice: 0.45,
      liquidityPool: { feeBps: 50 },
    },
  });

  assert.equal(preview.entryPrice, 0.58);
  assert.equal(preview.feeAmount, 0.125);
  assert.equal(preview.netStake, 24.875);
  assert.equal(Math.round(preview.estimatedContracts * 100), 4289);
  assert.equal(Math.round(preview.spread * 100), 3);
  assert.equal(Math.round(preview.breakevenPrice * 1000), 583);
});

test("order preview falls back to sane prices and ignores negative fees", () => {
  const preview = calculateOrderPreview({
    stake: "10",
    side: "NO",
    market: { yesPrice: 0, noPrice: null, feeBps: -20 },
  });

  assert.equal(preview.entryPrice, 0.5);
  assert.equal(preview.feeBps, 0);
  assert.equal(preview.estimatedContracts, 20);
  assert.equal(preview.spread, 0);
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

test("export filenames include date and active filters", () => {
  const filename = buildExportFilename(
    "FriendMarket Ledger Export",
    { filter: "withdrawable", sort: "amount_desc", action: "all" },
    new Date("2026-05-12T10:15:00Z"),
  );

  assert.equal(
    filename,
    "friendmarket-ledger-export_2026-05-12_filter-withdrawable_sort-amount-desc.csv",
  );
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

test("database ledger export filters map UI filters to Prisma where clauses", () => {
  assert.deepEqual(buildLedgerExportWhere("withdrawable"), { currency: "WITHDRAWABLE" });
  assert.deepEqual(buildLedgerExportWhere("deposit"), { source: "DEPOSIT" });
  assert.deepEqual(buildLedgerExportWhere("all"), {});
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

test("admin audit filters combine action actor market and date bounds", () => {
  const where = buildAdminAuditWhere({
    action: "market.resolved",
    actorId: "admin_1",
    marketId: "market_1",
    dateFrom: "2026-05-01",
    dateTo: "2026-05-12",
  });

  assert.equal(where.action, "market.resolved");
  assert.equal(where.actorId, "admin_1");
  assert.equal(where.marketId, "market_1");
  assert.equal(where.createdAt.gte.toISOString(), "2026-05-01T00:00:00.000Z");
  assert.equal(where.createdAt.lte.toISOString(), "2026-05-12T23:59:59.999Z");
});

test("admin audit filters ignore empty defaults and invalid dates", () => {
  assert.deepEqual(
    buildAdminAuditWhere({
      action: "all",
      actorId: " ",
      marketId: "",
      dateFrom: "soon",
      dateTo: "2026-13-40",
    }),
    {},
  );
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

test("risk engine explains score bands and user signals", () => {
  assert.equal(getRiskBand(12).label, "Clear");
  assert.equal(getRiskBand(48).label, "Monitor");
  assert.equal(getRiskBand(71).label, "High");

  const explanation = getRiskExplanation({
    risk_score: 71,
    frozen: true,
    risk_signals: ["High bonus velocity", "Dense friend boosting", "Repeat device"],
  });

  assert.equal(explanation.includes("High risk (70+)"), true);
  assert.equal(explanation.includes("High bonus velocity; Dense friend boosting; Repeat device"), true);
  assert.equal(explanation.includes("Account is frozen"), true);
});

test("market taxonomy covers sport-specific categories", () => {
  const options = getMarketCategoryOptions();
  assert.equal(options.includes("NBA"), true);
  assert.equal(options.includes("NFL"), true);
  assert.equal(options.includes("MLB"), true);
  assert.equal(options.includes("Soccer"), true);

  const nba = getMarketCategory("NBA");
  assert.equal(nba.resolutionNeeds.includes("Official NBA box score"), true);
  assert.equal(getResolutionTemplate("NBA").template.includes("official NBA result"), true);
  assert.equal(getCategoryCoverageSummary().some((item) => item.label === "College Sports"), true);
});

test("source adapters define required settlement fields by category", () => {
  const nba = getSourceAdapter("NBA");
  assert.equal(nba.providerType, "official_league_or_paid_sports_data_provider");
  assert.equal(nba.requiredFields.includes("officialBoxScoreUrl"), true);

  const invalidNfl = validateSourceAdapterConfig("NFL", {
    league: "NFL",
    gameId: "game_1",
  });
  assert.equal(invalidNfl.ok, false);
  assert.deepEqual(invalidNfl.missingFields, ["officialGamebookUrl"]);

  const validMlb = validateSourceAdapterConfig("MLB", {
    league: "MLB",
    gameId: "game_2",
    officialBoxScoreUrl: "https://www.mlb.com/scores",
  });
  assert.equal(validMlb.ok, true);
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

test("authenticated guard rejects anonymous requests", async () => {
  const request = new Request("http://friendmarket.test/api/funds/deposit");
  const guarded = await requireAuthenticated(request);

  assert.equal(guarded.session.authenticated, false);
  assert.equal(guarded.response.status, 401);
  assert.equal((await guarded.response.json()).message, "Sign in before continuing.");
});

test("admin permission guard rejects scoped-out admins", async () => {
  const previousShortcut = process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT;
  const previousDatabase = process.env.DATABASE_URL;
  const previousLevels = process.env.FRIENDMARKET_ADMIN_LEVELS_JSON;
  process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT = "1";
  process.env.DATABASE_URL = "postgresql://example/test";
  process.env.FRIENDMARKET_ADMIN_LEVELS_JSON = JSON.stringify({ user_1: "viewer" });

  const request = new Request("http://friendmarket.test/api/admin/config", {
    headers: {
      "x-friendmarket-role": "admin",
    },
  });
  const guarded = await requireAdminPermission(request, ADMIN_PERMISSIONS.CONFIG);

  assert.equal(guarded.session.isAdmin, true);
  assert.equal(guarded.response.status, 403);
  assert.equal((await guarded.response.json()).message, "Your admin role does not allow this action.");

  if (previousShortcut === undefined) {
    delete process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT;
  } else {
    process.env.FRIENDMARKET_DEV_ADMIN_SHORTCUT = previousShortcut;
  }
  if (previousDatabase === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = previousDatabase;
  }
  if (previousLevels === undefined) {
    delete process.env.FRIENDMARKET_ADMIN_LEVELS_JSON;
  } else {
    process.env.FRIENDMARKET_ADMIN_LEVELS_JSON = previousLevels;
  }
});

test("default market seeds are sports-only", async () => {
  const { defaultState } = await import("../lib/defaultState.js");
  const { NON_SPORT_MARKET_CATEGORY_LABELS } = await import("../lib/marketTaxonomy.js");
  const categories = new Set(defaultState.markets.map((market) => market.category));

  assert.equal(categories.has("NBA"), true);
  assert.equal(categories.has("NFL"), true);
  assert.equal(categories.has("MLB"), true);
  assert.equal(defaultState.markets.every((m) => !NON_SPORT_MARKET_CATEGORY_LABELS.has(m.category)), true);
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
  const fixedNow = new Date("2026-04-29T19:00:00Z");
  const snapshot = getMarketAlgorithmSnapshot(knicks, defaultState.liveGames, fixedNow);
  const summary = getMarketPipelineSummary(defaultState.markets, defaultState.liveGames);
  const linkedGame = getLinkedLiveGame(knicks, defaultState.liveGames);
  const ranked = rankMarketsBySignal(defaultState.markets, defaultState.liveGames, fixedNow);

  assert.equal(linkedGame.id, "game_knicks_celtics");
  assert.equal(getLiveGameClock(linkedGame, fixedNow), "Q3 - 6:42");
  assert.equal(snapshot.model, "Live sports tracker");
  assert.equal(snapshot.movementScore > 0, true);
  assert.equal(summary.liveLinked >= 3, true);
  assert.equal(summary.algorithmic >= 4, true);
  assert.equal(ranked[0].snapshot.movementScore >= ranked.at(-1).snapshot.movementScore, true);
});

test("getLinkedLiveGame matches seeded liveGameId to ESPN payload via matchingLegacyIds", async () => {
  const { defaultState } = await import("../lib/defaultState.js");
  const market = defaultState.markets.find((m) => m.id === "market_nba_cavs_raptors_live");
  const stub = {
    id: "espn_nba_stub",
    matchingLegacyIds: [market.liveGameId],
    status: "live",
    period: "Q4",
    clock: "2:00",
    shortName: "Raptors",
  };
  assert.equal(getLinkedLiveGame(market, [stub])?.id, "espn_nba_stub");
});
