export const marketCategories = [
  {
    id: "nba",
    label: "NBA",
    description: "Professional basketball markets for games, series, player props, and season outcomes.",
    examples: ["Game winner", "Point spread", "Player points", "Playoff advancement"],
    resolutionNeeds: ["Official NBA box score", "Game date", "Named teams or players"],
    defaultEvidenceSource: "NBA official game page or box score",
    resolutionTemplate:
      "Resolves using the official NBA result or box score for the named game, series, player, or season outcome. Postponed games wait for the completed official result unless admins void the market.",
  },
  {
    id: "nfl",
    label: "NFL",
    description: "Professional football markets for games, team results, player props, and season outcomes.",
    examples: ["Game winner", "Winning margin", "Player touchdowns", "Division winner"],
    resolutionNeeds: ["Official NFL gamebook", "Game date", "Named teams or players"],
    defaultEvidenceSource: "NFL official gamebook or scores page",
    resolutionTemplate:
      "Resolves using the official NFL result or gamebook for the named game, player, team, or season outcome. Ties, postponements, and cancellations follow the posted market rule.",
  },
  {
    id: "mlb",
    label: "MLB",
    description: "Professional baseball markets for games, innings, player stats, series, and season outcomes.",
    examples: ["Game winner", "First team to score", "Total runs", "Player hits"],
    resolutionNeeds: ["Official MLB box score", "Game date", "Named teams or players"],
    defaultEvidenceSource: "MLB official box score or scoreboard",
    resolutionTemplate:
      "Resolves using the official MLB box score for the named game, inning, player, or season outcome. Suspended or postponed games wait for the official completed result unless admins void the market.",
  },
  {
    id: "nhl",
    label: "NHL",
    description: "Professional hockey markets for games, periods, player stats, series, and season outcomes.",
    examples: ["Game winner", "Total goals", "First goal", "Playoff series winner"],
    resolutionNeeds: ["Official NHL gamecenter", "Game date", "Named teams or players"],
    defaultEvidenceSource: "NHL official gamecenter or box score",
    resolutionTemplate:
      "Resolves using the official NHL gamecenter result or box score for the named game, player, team, or series outcome.",
  },
  {
    id: "soccer",
    label: "Soccer",
    description: "Soccer markets for club, international, tournament, and match outcomes.",
    examples: ["Match winner", "Both teams to score", "Extra time", "Tournament winner"],
    resolutionNeeds: ["Official competition result", "Match date", "Named teams or players"],
    defaultEvidenceSource: "Official league, federation, or tournament match report",
    resolutionTemplate:
      "Resolves using the official competition result for the named match or tournament. Regulation, extra-time, and penalty rules must be stated in the market.",
  },
  {
    id: "college",
    label: "College Sports",
    description: "NCAA football, basketball, baseball, and other college sports markets.",
    examples: ["Bowl winner", "March Madness advancement", "Conference champion", "Player stat"],
    resolutionNeeds: ["Official NCAA or school result", "Event date", "Named school or player"],
    defaultEvidenceSource: "Official NCAA, conference, or school result page",
    resolutionTemplate:
      "Resolves using the official NCAA, conference, or school result for the named event, team, player, or season outcome.",
  },
  {
    id: "combat",
    label: "Combat Sports",
    description: "Boxing, UFC, MMA, and fight-card markets.",
    examples: ["Fight winner", "Method of victory", "Round total", "Title change"],
    resolutionNeeds: ["Official fight result", "Promotion", "Bout and card date"],
    defaultEvidenceSource: "Official promotion result or athletic commission record",
    resolutionTemplate:
      "Resolves using the official promotion or athletic commission result for the named bout. No-contest, draw, and overturned-result rules follow the posted market language.",
  },
  {
    id: "tennis",
    label: "Tennis",
    description: "Tennis markets for match results, tournament advancement, set totals, and player props.",
    examples: ["Match winner", "Set score", "Tournament winner", "Aces"],
    resolutionNeeds: ["Official tour result", "Tournament and match date", "Named players"],
    defaultEvidenceSource: "Official ATP, WTA, ITF, or tournament result page",
    resolutionTemplate:
      "Resolves using the official tour or tournament result for the named match, player, or tournament outcome. Retirements and walkovers follow the posted market rule.",
  },
  {
    id: "golf",
    label: "Golf",
    description: "Golf markets for tournaments, round scoring, cuts, and player finishes.",
    examples: ["Tournament winner", "Make the cut", "Top 10 finish", "Round score"],
    resolutionNeeds: ["Official leaderboard", "Tournament and round", "Named players"],
    defaultEvidenceSource: "Official tour or tournament leaderboard",
    resolutionTemplate:
      "Resolves using the official tournament leaderboard for the named player, round, or final result. Withdrawals and weather-shortened events follow the posted market rule.",
  },
  {
    id: "motorsports",
    label: "Motorsports",
    description: "Racing markets for Formula 1, NASCAR, IndyCar, and other motorsports.",
    examples: ["Race winner", "Podium finish", "Qualifying result", "Fastest lap"],
    resolutionNeeds: ["Official race classification", "Series and event date", "Named drivers or teams"],
    defaultEvidenceSource: "Official series race classification or timing sheet",
    resolutionTemplate:
      "Resolves using the official series classification for the named race, driver, team, or session. Penalties count once reflected in the official final classification.",
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
