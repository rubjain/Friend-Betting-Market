import { createLmsrMarketFromMarket, LMSRMarket } from "./lmsrMarket.js";
import { buildTradeAmounts } from "./tradeExecution.js";

export function ammBuyYes(yesReserve, noReserve, dollarIn, feeBps = 0) {
  return lmsrBuyWithDollars("YES", yesReserve, noReserve, dollarIn, feeBps);
}

export function ammBuyNo(yesReserve, noReserve, dollarIn, feeBps = 0) {
  return lmsrBuyWithDollars("NO", yesReserve, noReserve, dollarIn, feeBps);
}

function lmsrBuyWithDollars(side, qYes, qNo, dollarIn, feeBps = 0, b = 100) {
  const grossStake = Number(dollarIn);
  if (!(grossStake > 0)) return null;
  const { feeAmount, netAmount: netIn } = buildTradeAmounts({ grossAmount: grossStake, feeBps });
  const market = new LMSRMarket({ qYes, qNo, b });
  const sharesOut = market.getSharesForCost(side, netIn);
  const executed = side === "YES" ? market.buyYes(sharesOut) : market.buyNo(sharesOut);
  const sidePriceAfter = side === "YES" ? executed.afterProbability.yes : executed.afterProbability.no;
  const sidePriceBefore = side === "YES" ? executed.beforeProbability.yes : executed.beforeProbability.no;

  return {
    sharesOut,
    newYesReserve: executed.qYes,
    newNoReserve: executed.qNo,
    feeAmount,
    netIn,
    newYesPrice: executed.afterProbability.yes,
    newNoPrice: executed.afterProbability.no,
    priceImpact: sidePriceAfter - sidePriceBefore,
    oddsMultiplier: sharesOut / grossStake,
  };
}

export function getMultiplier(market, adminConfig) {
  if (!adminConfig.socialBoostsEnabled) {
    return 1;
  }

  const eligibleFriendCount = Math.min(market.friendsBoosting, adminConfig.maxGroupSize);
  const rawMultiplier = 1 + eligibleFriendCount * adminConfig.multiplierPerFriend;
  return Math.min(rawMultiplier, adminConfig.maxMultiplier);
}

export function normalizeFunding({ stake, withdrawableShare, bonusShare, market, adminConfig }) {
  const requestedStake = Math.max(0, Number(stake) || 0);
  let withdrawableStake = Math.max(0, Number(withdrawableShare) || 0);
  let requestedBonusStake = Math.max(0, Number(bonusShare) || 0);
  const notes = [];

  const bonusAllowedForMarket =
    adminConfig.bonusFundsEligibility === "all_markets" || market.eligibleForBonus;

  if (!bonusAllowedForMarket) {
    requestedBonusStake = 0;
    notes.push("Bonus balance is disabled on this market by admin policy.");
  }

  if (adminConfig.bonusUsageMode === "none") {
    requestedBonusStake = 0;
    notes.push("Bonus balance usage is currently disabled by admin policy.");
  }

  if (adminConfig.bonusUsageMode === "full" && requestedStake > 0) {
    requestedBonusStake = requestedStake;
    withdrawableStake = 0;
    notes.push("This market is configured to use bonus balance first.");
  }

  if (adminConfig.bonusUsageMode === "partial" && requestedStake > 0) {
    const maxBonusStakePercent = Math.max(
      0,
      Math.min(100, Number(adminConfig.maxBonusStakePercent ?? 100)),
    );
    const maxBonusStake = requestedStake * (maxBonusStakePercent / 100);
    if (requestedBonusStake > maxBonusStake) {
      requestedBonusStake = maxBonusStake;
      notes.push(`Bonus stake capped at ${maxBonusStakePercent}% of this bet.`);
    }
  }

  withdrawableStake = Math.min(requestedStake, withdrawableStake);
  requestedBonusStake = Math.min(requestedStake - withdrawableStake, requestedBonusStake);

  return {
    totalStake: withdrawableStake + requestedBonusStake,
    withdrawableStake,
    bonusStake: requestedBonusStake,
    note: notes.join(" "),
  };
}

export function capSocialBonus({ socialBonus, market, adminConfig }) {
  const caps = [
    Number(adminConfig.maxBonusPayoutPerUser),
    Number(adminConfig.maxBonusPayoutPerMarket),
    Number(adminConfig.dailyBonusPayoutLimit),
    Number(market.bonusPayoutCap),
  ].filter((value) => Number.isFinite(value) && value >= 0);
  const cap = caps.length ? Math.min(...caps) : socialBonus;
  return Math.min(socialBonus, cap);
}

export function calculatePayout({ stake, withdrawableShare, bonusShare, market, adminConfig, oddsMultiplier = 2 }) {
  const funding = normalizeFunding({ stake, withdrawableShare, bonusShare, market, adminConfig });
  const normalPayout = funding.totalStake * oddsMultiplier;
  const multiplier = getMultiplier(market, adminConfig);
  const rawBoostedPayout = normalPayout * multiplier;
  const uncappedSocialBonus = Math.max(0, rawBoostedPayout - normalPayout);
  const socialBonus = capSocialBonus({ socialBonus: uncappedSocialBonus, market, adminConfig });
  const boostedPayout = normalPayout + socialBonus;
  const withdrawableRatio =
    funding.totalStake === 0 ? 0 : funding.withdrawableStake / funding.totalStake;
  const bonusRatio = funding.totalStake === 0 ? 0 : funding.bonusStake / funding.totalStake;

  return {
    totalStake: funding.totalStake,
    normalPayout,
    boostedPayout,
    socialBonus,
    uncappedSocialBonus,
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

function priceForSide(market, side) {
  if (market?.liquidityPool) {
    const probabilities = createLmsrMarketFromMarket(market).getProbability();
    return side === "NO" ? probabilities.no : probabilities.yes;
  }
  const fallback = side === "NO" ? market.noPrice : market.yesPrice;
  const price = Number(fallback);
  return Number.isFinite(price) && price > 0 ? Math.min(1, price) : 0.5;
}

function feeBpsForMarket(market) {
  const feeBps = Number(market.liquidityPool?.feeBps ?? market.feeBps ?? 0);
  return Number.isFinite(feeBps) ? Math.max(0, feeBps) : 0;
}

export function priceForSideExported(market, side) {
  return priceForSide(market, side);
}

export function dollarsToShares(dollars, price) {
  const p = Math.max(0.001, Number(price) || 0.5);
  return Math.max(0, Number(dollars) || 0) / p;
}

export function sharesToDollars(shares, price) {
  const p = Math.max(0.001, Number(price) || 0.5);
  return Math.max(0, Number(shares) || 0) * p;
}

export function calculateOrderPreview({ stake, shares, side, market }) {
  const grossStake = Math.max(0, Number(stake) || 0);
  const requestedShares = Math.max(0, Number(shares) || 0);
  const feeBps = feeBpsForMarket(market);

  if (market.liquidityPool && (grossStake > 0 || requestedShares > 0)) {
    const lmsr = createLmsrMarketFromMarket(market);
    const currentProbability = lmsr.getProbability();
    const currentPrice = side === "YES" ? currentProbability.yes : currentProbability.no;
    const feeRate = feeBps / 10_000;
    const netBudget = Math.max(0, grossStake * (1 - feeRate));
    const estimatedContracts =
      requestedShares > 0 ? requestedShares : lmsr.getSharesForCost(side, netBudget);
    const trade = lmsr.previewBuy(side, estimatedContracts);
    const { feeAmount, grossAmount: estimatedCost } = buildTradeAmounts({ netAmount: trade.cost, feeBps });
    const effectiveEntryPrice = trade.shares > 0 ? estimatedCost / trade.shares : currentPrice;

    return {
      side,
      grossStake: estimatedCost,
      netStake: trade.cost,
      currentPrice,
      entryPrice: effectiveEntryPrice,
      feeBps,
      feeAmount,
      estimatedContracts: trade.shares,
      spread: 0,
      breakevenPrice: effectiveEntryPrice,
      priceImpact:
        side === "YES"
          ? trade.afterProbability.yes - trade.beforeProbability.yes
          : trade.afterProbability.no - trade.beforeProbability.no,
      newYesPrice: trade.afterProbability.yes,
      newNoPrice: trade.afterProbability.no,
      estimatedCost,
      oddsMultiplier: estimatedCost > 0 ? trade.shares / estimatedCost : 0,
      hasAmm: true,
      hasLmsr: true,
      liquidityParameter: lmsr.b,
    };
  }

  const entryPrice = priceForSide(market, side);
  const yesPrice = priceForSide(market, "YES");
  const noPrice = priceForSide(market, "NO");
  const netStake = requestedShares > 0 ? requestedShares * entryPrice : buildTradeAmounts({ grossAmount: grossStake, feeBps }).netAmount;
  const { feeAmount, grossAmount: estimatedCost } = buildTradeAmounts({ netAmount: netStake, feeBps });
  const estimatedContracts = requestedShares > 0 ? requestedShares : entryPrice > 0 ? netStake / entryPrice : 0;
  const spread = Math.max(0, yesPrice + noPrice - 1);
  const breakevenPrice = estimatedContracts > 0 ? estimatedCost / estimatedContracts : entryPrice;

  return {
    side,
    grossStake: estimatedCost,
    netStake,
    currentPrice: entryPrice,
    entryPrice,
    feeBps,
    feeAmount,
    estimatedContracts,
    spread,
    breakevenPrice,
    priceImpact: 0,
    newYesPrice: yesPrice,
    newNoPrice: noPrice,
    estimatedCost,
    oddsMultiplier: 2,
    hasAmm: false,
    hasLmsr: false,
  };
}
