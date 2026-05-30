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

/** Calendar day in local timezone */
function sameLocalCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Game tip time in the user's local timezone (Intl uses runtime default zone — browser = system).
 */
function formatLocalGameStart(startMs, now = new Date()) {
  const startDate = new Date(startMs);
  const locNow = new Date(now);

  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(startDate);

  if (sameLocalCalendarDay(startDate, locNow)) {
    return timePart;
  }

  const tomorrow = new Date(locNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameLocalCalendarDay(startDate, tomorrow)) {
    return `Tomorrow ${timePart}`;
  }

  const datePart = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(startDate);

  if (startDate.getFullYear() !== locNow.getFullYear()) {
    const yearPart = new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(startDate);
    return `${datePart}, ${yearPart} · ${timePart}`;
  }

  return `${datePart} · ${timePart}`;
}

export function getMarketAlgorithmSnapshot(market, liveGames = [], now = new Date()) {
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
  // ESPN markets use the ESPN game ID directly as the market ID, so the only
  // correct link is an exact ID match. Fuzzy title matching here would link a
  // future matchup to an unrelated in-progress game that shares a team name,
  // showing the wrong score and a bogus LIVE badge.
  if (String(market.id ?? "").startsWith("espn_")) {
    return liveGames.find((game) => game.id === market.id) ?? null;
  }

  const linkedId = market.liveGameId;
  if (linkedId) {
    const direct = liveGames.find((game) => game.id === linkedId);
    if (direct) {
      return direct;
    }
    return (
      liveGames.find(
        (game) => Array.isArray(game.matchingLegacyIds) && game.matchingLegacyIds.includes(linkedId),
      ) ?? null
    );
  }
  return liveGames.find((game) => market.title.toLowerCase().includes(game.shortName.toLowerCase())) ?? null;
}

export function getLiveGameClock(game, now = new Date()) {
  if (!game) {
    return "No live feed";
  }
  if (game.status === "live") {
    return `${game.period} - ${game.clock}`;
  }
  if (game.status === "final") {
    return "Final";
  }

  const startMs = Date.parse(game.startTime || "");
  if (!Number.isFinite(startMs)) {
    return "Scheduled";
  }

  const minutes = minutesUntil(game.startTime, now);
  if (minutes !== null && minutes <= 0 && minutes >= -30) {
    return "Starting soon";
  }

  return formatLocalGameStart(startMs, now);
}

export function getMarketPipelineSummary(markets = [], liveGames = []) {
  return {
    liveLinked: markets.filter((market) => getLinkedLiveGame(market, liveGames)).length,
    algorithmic: markets.filter((market) => market.algorithm?.model).length,
    needsSource: markets.filter((market) => (market.evidenceLinks || []).some((source) => !source.url)).length,
    categories: new Set(markets.map((market) => market.category)).size,
  };
}

export function rankMarketsBySignal(markets = [], liveGames = [], now = new Date()) {
  return [...markets]
    .map((market) => ({
      market,
      snapshot: getMarketAlgorithmSnapshot(market, liveGames, now),
    }))
    .sort((a, b) => b.snapshot.movementScore - a.snapshot.movementScore);
}
