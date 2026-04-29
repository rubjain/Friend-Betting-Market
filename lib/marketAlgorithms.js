function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function minutesUntil(dateValue, now = new Date()) {
  const timestamp = Date.parse(dateValue || "");
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return Math.round((timestamp - now.getTime()) / 60000);
}

export function getMarketAlgorithmSnapshot(market, liveGames = [], now = new Date("2026-04-29T19:00:00Z")) {
  const volume = Number(market.volume || 0);
  const boostPressure = Number(market.friendsBoosting || 0) / 5;
  const daysToClose = minutesUntil(market.closeTime || market.endDate, now);
  const urgency = daysToClose === null ? 0.35 : clamp(1 - daysToClose / (60 * 24 * 21), 0, 1);
  const priceSkew = Math.abs(Number(market.yesPrice || 0.5) - 0.5) * 2;
  const linkedGame = getLinkedLiveGame(market, liveGames);
  const livePressure = linkedGame ? 0.18 : 0;
  const confidence = clamp(0.42 + Math.log10(volume + 1) / 12 + urgency * 0.16 - priceSkew * 0.08, 0.1, 0.92);
  const liquidityScore = clamp(Math.round(Math.log10(volume + 1) * 24), 10, 100);
  const movementScore = clamp(Math.round((boostPressure * 36) + (urgency * 34) + (priceSkew * 18) + (livePressure * 100)), 4, 100);

  return {
    confidence,
    liquidityScore,
    movementScore,
    signal: movementScore >= 70 ? "Hot" : movementScore >= 42 ? "Moving" : "Calm",
    model: linkedGame ? "Live sports tracker" : `${market.category} baseline model`,
    recommendation:
      confidence >= 0.72
        ? "Strong data coverage"
        : confidence >= 0.55
          ? "Watch price drift"
          : "Needs more source data",
  };
}

export function getLinkedLiveGame(market, liveGames = []) {
  const linkedId = market.liveGameId;
  if (linkedId) {
    return liveGames.find((game) => game.id === linkedId) ?? null;
  }
  return liveGames.find((game) => market.title.toLowerCase().includes(game.shortName.toLowerCase())) ?? null;
}

export function getLiveGameClock(game, now = new Date("2026-04-29T19:00:00Z")) {
  if (!game) {
    return "No live feed";
  }
  if (game.status === "live") {
    return `${game.period} · ${game.clock}`;
  }
  if (game.status === "final") {
    return "Final";
  }
  const minutes = minutesUntil(game.startTime, now);
  if (minutes === null) {
    return "Scheduled";
  }
  if (minutes <= 0) {
    return "Starting soon";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  return `${Math.round(minutes / 60)}h`;
}

export function getMarketPipelineSummary(markets = [], liveGames = []) {
  return {
    liveLinked: markets.filter((market) => getLinkedLiveGame(market, liveGames)).length,
    algorithmic: markets.filter((market) => market.algorithm?.model).length,
    needsSource: markets.filter((market) => (market.evidenceLinks || []).some((source) => !source.url)).length,
    categories: new Set(markets.map((market) => market.category)).size,
  };
}

export function rankMarketsBySignal(markets = [], liveGames = []) {
  return [...markets]
    .map((market) => ({
      market,
      snapshot: getMarketAlgorithmSnapshot(market, liveGames),
    }))
    .sort((a, b) => b.snapshot.movementScore - a.snapshot.movementScore);
}
