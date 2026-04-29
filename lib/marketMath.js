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

export function calculatePayout({ stake, withdrawableShare, bonusShare, market, adminConfig }) {
  const funding = normalizeFunding({ stake, withdrawableShare, bonusShare, market, adminConfig });
  const impliedOddsMultiplier = 2;
  const normalPayout = funding.totalStake * impliedOddsMultiplier;
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
