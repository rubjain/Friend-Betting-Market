const sportAdapter = {
  providerType: "official_league_or_paid_sports_data_provider",
  requiredFields: ["league", "eventId", "officialResultsUrl"],
  fallbackPolicy:
    "If the primary feed is unavailable, resolve from the league, tournament, promotion, or series official public result page.",
};

const sourceAdapters = {
  NBA: {
    ...sportAdapter,
    requiredFields: ["league", "gameId", "officialBoxScoreUrl"],
    fallbackPolicy: "Use the NBA official box score or game page as the source of record.",
  },
  NFL: {
    ...sportAdapter,
    requiredFields: ["league", "gameId", "officialGamebookUrl"],
    fallbackPolicy: "Use the NFL official gamebook or scores page as the source of record.",
  },
  MLB: {
    ...sportAdapter,
    requiredFields: ["league", "gameId", "officialBoxScoreUrl"],
    fallbackPolicy: "Use the MLB official box score or scoreboard as the source of record.",
  },
  NHL: {
    ...sportAdapter,
    requiredFields: ["league", "gameId", "officialGamecenterUrl"],
    fallbackPolicy: "Use the NHL official gamecenter or box score as the source of record.",
  },
  Soccer: {
    ...sportAdapter,
    requiredFields: ["competition", "matchId", "officialMatchReportUrl"],
    fallbackPolicy: "Use the official competition, federation, or tournament match report.",
  },
  "College Sports": {
    ...sportAdapter,
    requiredFields: ["sport", "eventId", "officialResultsUrl"],
    fallbackPolicy: "Use the official NCAA, conference, or school result page.",
  },
  "Combat Sports": {
    ...sportAdapter,
    requiredFields: ["promotion", "boutId", "officialResultUrl"],
    fallbackPolicy: "Use the official promotion result or athletic commission record.",
  },
  Tennis: {
    ...sportAdapter,
    requiredFields: ["tour", "matchId", "officialResultUrl"],
    fallbackPolicy: "Use the official ATP, WTA, ITF, or tournament result page.",
  },
  Golf: {
    ...sportAdapter,
    requiredFields: ["tour", "tournamentId", "officialLeaderboardUrl"],
    fallbackPolicy: "Use the official tour or tournament leaderboard.",
  },
  Motorsports: {
    ...sportAdapter,
    requiredFields: ["series", "raceId", "officialClassificationUrl"],
    fallbackPolicy: "Use the official series race classification or timing sheet.",
  },
};

export function getSourceAdapter(category) {
  return sourceAdapters[category] || sportAdapter;
}

export function getSourceAdapters() {
  return sourceAdapters;
}

export function validateSourceAdapterConfig(category, config = {}) {
  const adapter = getSourceAdapter(category);
  const missingFields = adapter.requiredFields.filter((field) => {
    const value = config[field];
    return value === undefined || value === null || String(value).trim() === "";
  });

  return {
    ok: missingFields.length === 0,
    category,
    providerType: adapter.providerType,
    missingFields,
    fallbackPolicy: adapter.fallbackPolicy,
  };
}
