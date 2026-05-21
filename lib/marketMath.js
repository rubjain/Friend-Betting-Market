// ── Constant-product AMM ──────────────────────────────────────────────────────
// Pool invariant: yesReserve × noReserve = k
//
// Buying YES with $d:
//   User mints netIn YES+NO pairs, swaps netIn NO into the pool for YES.
//   sharesOut = netIn + Ry - k/(Rn + netIn)
//
// Buying NO with $d is symmetric (mint + swap YES into pool for NO).

export function ammBuyYes(yesReserve, noReserve, dollarIn, feeBps = 0) {
  const Ry = Number(yesReserve);
  const Rn = Number(noReserve);
  if (!Ry || !Rn || Ry <= 0 || Rn <= 0 || !(dollarIn > 0)) return null;
  const k = Ry * Rn;
  const feeAmount = dollarIn * (feeBps / 10_000);
  const netIn = dollarIn - feeAmount;
  const newNoReserve = Rn + netIn;
  const newYesReserve = k / newNoReserve;
  const yesFromSwap = Ry - newYesReserve;
  const sharesOut = netIn + yesFromSwap; // minted YES + YES from swap
  const totalAfter = newYesReserve + newNoReserve;
  return {
    sharesOut,
    newYesReserve,
    newNoReserve,
    feeAmount,
    netIn,
    newYesPrice: newNoReserve / totalAfter,
    newNoPrice: newYesReserve / totalAfter,
    priceImpact: newNoReserve / totalAfter - Rn / (Ry + Rn),
    oddsMultiplier: sharesOut / dollarIn, // payout per gross $ if you win
  };
}

export function ammBuyNo(yesReserve, noReserve, dollarIn, feeBps = 0) {
  const Ry = Number(yesReserve);
  const Rn = Number(noReserve);
  if (!Ry || !Rn || Ry <= 0 || Rn <= 0 || !(dollarIn > 0)) return null;
  const k = Ry * Rn;
  const feeAmount = dollarIn * (feeBps / 10_000);
  const netIn = dollarIn - feeAmount;
  const newYesReserve = Ry + netIn;
  const newNoReserve = k / newYesReserve;
  const noFromSwap = Rn - newNoReserve;
  const sharesOut = netIn + noFromSwap; // minted NO + NO from swap
  const totalAfter = newYesReserve + newNoReserve;
  return {
    sharesOut,
    newYesReserve,
    newNoReserve,
    feeAmount,
    netIn,
    newYesPrice: newNoReserve / totalAfter,
    newNoPrice: newYesReserve / totalAfter,
    priceImpact: newYesReserve / totalAfter - Ry / (Ry + Rn),
    oddsMultiplier: sharesOut / dollarIn,
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

export function calculateOrderPreview({ stake, side, market }) {
  const grossStake = Math.max(0, Number(stake) || 0);
  const feeBps = feeBpsForMarket(market);

  // ── AMM path (pool is seeded) ──────────────────────────────────────────────
  const pool = market.liquidityPool;
  if (pool && Number(pool.yesReserve) > 0 && Number(pool.noReserve) > 0 && grossStake > 0) {
    const ammFn = side === "YES" ? ammBuyYes : ammBuyNo;
    const amm = ammFn(Number(pool.yesReserve), Number(pool.noReserve), grossStake, feeBps);
    if (amm) {
      const effectiveEntryPrice = grossStake / amm.sharesOut;
      return {
        side,
        grossStake,
        netStake: amm.netIn,
        entryPrice: effectiveEntryPrice,
        feeBps,
        feeAmount: amm.feeAmount,
        estimatedContracts: amm.sharesOut,
        spread: 0, // no bid-ask spread in AMM
        breakevenPrice: effectiveEntryPrice,
        priceImpact: amm.priceImpact,
        newYesPrice: amm.newYesPrice,
        newNoPrice: amm.newNoPrice,
        oddsMultiplier: amm.oddsMultiplier,
        hasAmm: true,
      };
    }
  }

  // ── Fallback: no pool yet (fixed-odds display) ─────────────────────────────
  const entryPrice = priceForSide(market, side);
  const yesPrice = priceForSide(market, "YES");
  const noPrice = priceForSide(market, "NO");
  const feeAmount = grossStake * (feeBps / 10_000);
  const netStake = Math.max(0, grossStake - feeAmount);
  const estimatedContracts = entryPrice > 0 ? netStake / entryPrice : 0;
  const spread = Math.max(0, yesPrice + noPrice - 1);
  const breakevenPrice = estimatedContracts > 0 ? grossStake / estimatedContracts : entryPrice;

  return {
    side,
    grossStake,
    netStake,
    entryPrice,
    feeBps,
    feeAmount,
    estimatedContracts,
    spread,
    breakevenPrice,
    priceImpact: 0,
    newYesPrice: yesPrice,
    newNoPrice: noPrice,
    oddsMultiplier: 2,
    hasAmm: false,
  };
}
