import type { MarketGeneratorResult } from "./types";

export function newsMarketGenerator(): MarketGeneratorResult {
  return {
    sourceName: "news-stub",
    markets: [
      {
        question: "Will a major campus event be announced before Friday?",
        category: "news",
        closeTime: "2026-05-08T23:59:00.000Z",
        resolutionTime: "2026-05-09T02:00:00.000Z",
        resolutionSource: "Official campus announcements page",
        resolutionRules:
          "Resolves YES if an official campus announcement page publishes a new major event announcement before the close time. Resolves NO if no qualifying announcement appears. Admin must define the campus and qualifying event threshold before publishing.",
        externalSourceName: "news-stub",
        externalSourceId: "campus-event-announced-before-2026-05-08",
        metadata: {
          topic: "campus-events",
          dataProvider: "placeholder",
        },
      },
    ],
  };
}
