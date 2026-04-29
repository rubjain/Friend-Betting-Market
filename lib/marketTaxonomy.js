export const marketCategories = [
  {
    id: "sports",
    label: "Sports",
    description: "Team, player, league, tournament, and season outcome markets.",
    examples: ["NBA", "NFL", "MLB", "NHL", "Soccer", "College sports", "Combat sports"],
    resolutionNeeds: ["Official league result", "Box score source", "Clear event date"],
    defaultEvidenceSource: "Official league site or published box score",
    resolutionTemplate:
      "Resolves using the official league result for the named event. If the event is postponed, settlement waits for the completed official result unless admins void the market.",
  },
  {
    id: "politics",
    label: "Politics",
    description: "Election, legislation, appointment, polling, and public-policy markets.",
    examples: ["Elections", "Legislation", "Cabinet or court appointments", "Ballot measures"],
    resolutionNeeds: ["Official government source", "Named jurisdiction", "Appeal or recount handling"],
    defaultEvidenceSource: "Official election, legislative, court, or government record",
    resolutionTemplate:
      "Resolves using the named official government source. Recounts, appeals, and corrections follow the market's stated finality rule before settlement.",
  },
  {
    id: "weather",
    label: "Weather",
    description: "Temperature, precipitation, snowfall, storm, and climate-record markets.",
    examples: ["Daily high temperature", "Rainfall", "Snowfall", "Named storms", "Air quality"],
    resolutionNeeds: ["Station ID", "Measurement window", "Official weather data source"],
    defaultEvidenceSource: "Named weather station or official weather data API",
    resolutionTemplate:
      "Resolves using the named station, measurement window, and official weather data source. Missing observations require the stated fallback source.",
  },
  {
    id: "crypto",
    label: "Crypto",
    description: "Token price, chain activity, protocol launch, and market-structure outcomes.",
    examples: ["BTC price", "ETH price", "ETF flows", "Protocol upgrades", "Stablecoins"],
    resolutionNeeds: ["Reference exchange", "Price timestamp", "Fallback data provider"],
    defaultEvidenceSource: "Reference exchange close, index provider, or fallback price source",
    resolutionTemplate:
      "Resolves using the reference source at the stated timestamp. If the primary source is unavailable, admins use the configured fallback provider.",
  },
  {
    id: "finance",
    label: "Finance",
    description: "Stocks, economic indicators, rates, earnings, and macro outcome markets.",
    examples: ["Equities", "CPI", "Fed rates", "Earnings", "IPO activity"],
    resolutionNeeds: ["Primary data release", "Revision policy", "Market close timestamp"],
    defaultEvidenceSource: "Primary market, issuer, exchange, or economic data release",
    resolutionTemplate:
      "Resolves using the primary published release or market close value. Later revisions are handled according to the market's revision policy.",
  },
  {
    id: "tech",
    label: "Tech",
    description: "Product launches, AI milestones, platform changes, and company roadmap markets.",
    examples: ["AI launches", "App releases", "Developer events", "Platform policy"],
    resolutionNeeds: ["Company announcement", "Launch availability", "Geography and platform scope"],
    defaultEvidenceSource: "Company announcement, product page, or official changelog",
    resolutionTemplate:
      "Resolves using official company communication and observable availability within the specified geography, platform, and time window.",
  },
  {
    id: "culture",
    label: "Culture",
    description: "Entertainment, awards, creator, media, and internet trend markets.",
    examples: ["Awards", "Streaming charts", "Music releases", "Creator milestones"],
    resolutionNeeds: ["Official chart or award source", "Time window", "Tie handling"],
    defaultEvidenceSource: "Official award body, chart provider, platform, or publisher",
    resolutionTemplate:
      "Resolves using the named official cultural source for the stated time window. Ties and category changes follow the market's posted rules.",
  },
];

export function getMarketCategoryOptions() {
  return marketCategories.map(({ label }) => label);
}

export function getMarketCategory(label) {
  return marketCategories.find((category) => category.label === label) ?? marketCategories[0];
}

export function getCategoryCoverageSummary() {
  return marketCategories.map((category) => ({
    label: category.label,
    exampleCount: category.examples.length,
    primaryNeed: category.resolutionNeeds[0],
  }));
}

export function getResolutionTemplate(label) {
  const category = getMarketCategory(label);
  return {
    category: category.label,
    checklist: category.resolutionNeeds,
    evidenceSource: category.defaultEvidenceSource,
    template: category.resolutionTemplate,
  };
}
