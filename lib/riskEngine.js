function boostNameFromUsername(username) {
  return String(username || "")
    .replace(/^@/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .split(" ")[0];
}

export function getBoostRiskSignals({ friend, market, markets, adminConfig }) {
  const signals = [];
  const boostName = friend ? friend.name.split(" ")[0] : "";
  const maxGroupSize = Number(adminConfig.maxGroupSize) || 1;

  if (friend?.boostCount >= 6) {
    signals.push("High repeat boost activity");
  }

  const repeatedMarketCount = markets.filter((item) => item.friendGroup?.includes(boostName)).length;
  if (repeatedMarketCount >= 3) {
    signals.push("Repeated booster across markets");
  }

  const groupDensity = (market.friendGroup?.length || 0) / maxGroupSize;
  if (groupDensity >= 0.8) {
    signals.push("Dense friend boosting cluster");
  }

  if (market.friendGroup?.some((name) => name === boostNameFromUsername(friend?.username))) {
    signals.push("Known friend graph participant");
  }

  return [...new Set(signals)];
}

export function applyRiskSignalsToUser(user, signals, scoreStep = 8) {
  if (!user || !signals.length) {
    return user;
  }

  const existing = new Set(user.risk_signals || []);
  signals.forEach((signal) => existing.add(signal));
  user.risk_signals = [...existing];
  user.risk_score = Math.min(100, Math.max(user.risk_score || 0, 20) + signals.length * scoreStep);
  if (user.risk_score >= 70) {
    user.risk_status = "review";
  } else if (user.risk_score >= 40 && user.risk_status === "clear") {
    user.risk_status = "monitor";
  }

  return user;
}
