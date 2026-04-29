const sourceAdapters = {
  Sports: {
    providerType: "official_league_or_paid_data_provider",
    requiredFields: ["league", "eventId", "officialResultsUrl"],
    fallbackPolicy: "If the primary feed is unavailable, resolve from the league's official public result page.",
  },
  Politics: {
    providerType: "official_election_or_government_source",
    requiredFields: ["jurisdiction", "officeOrMeasure", "officialResultsUrl"],
    fallbackPolicy: "Use the certifying election authority or government publication as the source of record.",
  },
  Weather: {
    providerType: "weather_station_or_climate_api",
    requiredFields: ["stationId", "metric", "observationWindow", "sourceUrl"],
    fallbackPolicy: "Use the named station's official observation archive for the exact market window.",
  },
  Crypto: {
    providerType: "reference_exchange_or_index",
    requiredFields: ["assetSymbol", "quoteCurrency", "referenceVenue", "snapshotTime"],
    fallbackPolicy: "Use the configured reference venue or index at the market's settlement timestamp.",
  },
  Finance: {
    providerType: "exchange_or_market_data_provider",
    requiredFields: ["ticker", "exchange", "priceType", "snapshotTime"],
    fallbackPolicy: "Use the listed exchange close or the configured licensed market-data provider.",
  },
  Tech: {
    providerType: "company_or_product_source",
    requiredFields: ["company", "productOrMetric", "sourceUrl"],
    fallbackPolicy: "Use the named company's official release note, status page, or published metric.",
  },
  Culture: {
    providerType: "official_platform_or_publisher_source",
    requiredFields: ["publisher", "metric", "sourceUrl"],
    fallbackPolicy: "Use the official chart, platform, box-office, award, or publisher source named in the market.",
  },
};

export function getSourceAdapter(category) {
  return sourceAdapters[category] || sourceAdapters.Culture;
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
