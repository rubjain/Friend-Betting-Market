function boostNameFromUsername(username) {
  return String(username || "")
    .replace(/^@/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .split(" ")[0];
}

export function getRiskBand(score = 0) {
  const normalized = Number(score) || 0;
  if (normalized >= 70) {
    return {
      label: "High",
      status: "review",
      threshold: "70+",
      explanation: "Manual review is required before trust-sensitive actions continue.",
    };
  }
  if (normalized >= 40) {
    return {
      label: "Monitor",
      status: "monitor",
      threshold: "40-69",
      explanation: "Activity is elevated; monitor trends and require context before action.",
    };
  }
  return {
    label: "Clear",
    status: "clear",
    threshold: "0-39",
    explanation: "No material risk pattern is currently detected.",
  };
}

export function getRiskExplanation(user = {}) {
  const band = getRiskBand(user.risk_score);
  const signals = Array.isArray(user.risk_signals) ? user.risk_signals : [];
  const signalText = signals.length ? signals.slice(0, 3).join("; ") : "No active signals";
  const frozenText = user.frozen ? " Account is frozen pending manual review." : "";
  return `${band.label} risk (${band.threshold}): ${band.explanation} Signals: ${signalText}.${frozenText}`;
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
