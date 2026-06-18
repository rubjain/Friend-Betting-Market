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
  Crypto: {
    providerType: "exchange_index_or_on_chain_reference",
    requiredFields: ["asset", "indexVenue", "officialIndexUrl"],
    fallbackPolicy: "Use the published index methodology page or chain explorer rule stated in the market.",
  },
  Finance: {
    providerType: "issuer_or_index_vendor",
    requiredFields: ["instrument", "metric", "officialPublicationUrl"],
    fallbackPolicy: "Use the issuer, exchange, or government statistical release cited in the market.",
  },
  Weather: {
    providerType: "national_meteorological_service",
    requiredFields: ["stationId", "localDate", "officialProductUrl"],
    fallbackPolicy: "Use the named NWS or WMO-affiliated product for the stated local calendar date.",
  },
  Politics: {
    providerType: "certified_government_record",
    requiredFields: ["jurisdiction", "contestId", "certifiedResultsUrl"],
    fallbackPolicy: "Use the certified canvass, official gazette, or parliament record named in the market.",
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
